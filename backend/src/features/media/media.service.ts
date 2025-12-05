import { singleton, inject } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import { MediaRepository } from './media.repository';
import { Media, MediaType } from './media.entity';
import {
  uploadToS3,
  deleteFromS3,
  getDownloadSignedUrl,
  getUploadSignedUrl,
  S3_BUCKET,
} from '@config/s3.config';
import {
  BadRequestException,
  NotFoundException,
} from '@shared/exceptions/http-exceptions';
import { auditLogger, logger } from '@config/logger.config';

/**
 * File validation configuration per media type
 */
interface MediaTypeConfig {
  allowedExtensions: string[];
  allowedMimeTypes: string[];
  maxSizeBytes: number;
  magicBytes: Array<{ bytes: number[]; offset: number }>;
}

/**
 * Media type configurations with file validation rules
 *
 * Security: Uses magic bytes validation to prevent MIME type spoofing
 */
const MEDIA_TYPE_CONFIG: Record<MediaType, MediaTypeConfig> = {
  [MediaType.IMAGE]: {
    allowedExtensions: ['.jpg', '.jpeg', '.png'],
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    magicBytes: [
      // JPEG: FFD8FF
      { bytes: [0xff, 0xd8, 0xff], offset: 0 },
      // PNG: 89504E47
      { bytes: [0x89, 0x50, 0x4e, 0x47], offset: 0 },
    ],
  },
  [MediaType.VIDEO]: {
    allowedExtensions: ['.mp4'],
    allowedMimeTypes: ['video/mp4'],
    maxSizeBytes: 16 * 1024 * 1024, // 16MB
    magicBytes: [
      // MP4: ftyp at offset 4
      { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
      // MP4: moov box - alternative start
      { bytes: [0x00, 0x00, 0x00], offset: 0 },
    ],
  },
  [MediaType.DOCUMENT]: {
    allowedExtensions: ['.pdf'],
    allowedMimeTypes: ['application/pdf'],
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
    magicBytes: [
      // PDF: %PDF
      { bytes: [0x25, 0x50, 0x44, 0x46], offset: 0 },
    ],
  },
};

/**
 * Response type for media with download URL
 */
export interface MediaWithUrl extends Media {
  downloadUrl: string;
}

/**
 * Response type for presigned upload URL
 */
export interface PresignedUploadResponse {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

/**
 * Multer file interface
 */
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

/**
 * Media Service
 *
 * Handles media file upload, retrieval, and deletion operations.
 * Includes security features:
 * - Magic bytes validation to prevent MIME type spoofing
 * - File size limits per media type
 * - Tenant-scoped operations
 * - S3 cleanup on database failure
 */
@singleton()
export class MediaService {
  constructor(
    @inject(MediaRepository) private mediaRepository: MediaRepository
  ) {}

  /**
   * Uploads a media file to S3 and creates a database record
   *
   * Security considerations:
   * - Validates file extension
   * - Validates MIME type
   * - Validates file size
   * - Validates magic bytes to prevent MIME spoofing
   * - Cleans up S3 if database operation fails
   *
   * @param file - Uploaded file from multer
   * @param type - Media type (image, video, document)
   * @param tenantId - Tenant UUID
   * @param userId - User UUID who uploaded the file
   * @returns Media record with signed download URL
   */
  async uploadMedia(
    file: UploadedFile,
    type: MediaType,
    tenantId: string,
    userId: string
  ): Promise<MediaWithUrl> {
    const config = MEDIA_TYPE_CONFIG[type];

    // Validate file extension
    const extension = this.getFileExtension(file.originalname);
    if (!config.allowedExtensions.includes(extension.toLowerCase())) {
      throw new BadRequestException(
        `Invalid file extension. Allowed: ${config.allowedExtensions.join(', ')}`
      );
    }

    // Validate MIME type (but don't fully trust it)
    if (!config.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${config.allowedMimeTypes.join(', ')}`
      );
    }

    // Validate file size
    if (file.size > config.maxSizeBytes) {
      const maxSizeMB = config.maxSizeBytes / (1024 * 1024);
      throw new BadRequestException(
        `File size exceeds maximum allowed (${maxSizeMB}MB)`
      );
    }

    // Validate magic bytes - critical security check
    if (!this.validateMagicBytes(file.buffer, config.magicBytes)) {
      logger.warn('Magic bytes validation failed - possible MIME spoofing attempt', {
        tenantId,
        userId,
        originalName: file.originalname,
        claimedMimeType: file.mimetype,
      });
      throw new BadRequestException(
        'File content does not match the declared file type'
      );
    }

    // Generate S3 key with tenant isolation
    const s3Key = this.generateS3Key(tenantId, type, file.originalname);

    // Upload to S3
    try {
      await uploadToS3(s3Key, file.buffer, file.mimetype);
    } catch (error) {
      logger.error('Failed to upload file to S3', {
        error,
        tenantId,
        s3Key,
      });
      throw new BadRequestException('Failed to upload file');
    }

    // Create database record
    let media: Media;
    try {
      media = await this.mediaRepository.create({
        tenantId,
        type,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        s3Key,
        s3Bucket: S3_BUCKET,
        uploadedBy: userId,
      });
    } catch (error) {
      // Cleanup S3 on database failure
      logger.error('Failed to create media record, cleaning up S3', {
        error,
        tenantId,
        s3Key,
      });
      await this.safeDeleteFromS3(s3Key);
      throw new BadRequestException('Failed to save media record');
    }

    auditLogger.info('Media uploaded', {
      action: 'media.upload',
      tenantId,
      userId,
      mediaId: media.id,
      type,
      originalName: file.originalname,
      fileSize: file.size,
    });

    // Generate download URL
    const downloadUrl = await getDownloadSignedUrl(s3Key);

    return {
      ...media,
      downloadUrl,
    };
  }

  /**
   * Gets a media record with a signed download URL
   *
   * @param id - Media UUID
   * @param tenantId - Tenant UUID for authorization
   * @returns Media record with download URL
   */
  async getMedia(id: string, tenantId: string): Promise<MediaWithUrl> {
    const media = await this.mediaRepository.findById(id, tenantId);

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    const downloadUrl = await getDownloadSignedUrl(media.s3Key);

    return {
      ...media,
      downloadUrl,
    };
  }

  /**
   * Deletes a media file from S3 and removes the database record
   *
   * @param id - Media UUID
   * @param tenantId - Tenant UUID for authorization
   */
  async deleteMedia(id: string, tenantId: string): Promise<void> {
    const media = await this.mediaRepository.findById(id, tenantId);

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    // Delete from S3
    try {
      await deleteFromS3(media.s3Key);
    } catch (error) {
      logger.error('Failed to delete file from S3', {
        error,
        tenantId,
        mediaId: id,
        s3Key: media.s3Key,
      });
      // Continue with database deletion even if S3 fails
      // Orphaned S3 objects can be cleaned up with lifecycle rules
    }

    // Delete database record
    await this.mediaRepository.delete(id, tenantId);

    auditLogger.info('Media deleted', {
      action: 'media.delete',
      tenantId,
      mediaId: id,
      s3Key: media.s3Key,
    });
  }

  /**
   * Gets a presigned URL for direct browser upload to S3
   *
   * This allows clients to upload directly to S3 without going through
   * the application server, which is more efficient for large files.
   *
   * @param type - Media type
   * @param fileName - Original file name
   * @param tenantId - Tenant UUID
   * @returns Presigned upload URL with key and expiry information
   */
  async getPresignedUploadUrl(
    type: MediaType,
    fileName: string,
    tenantId: string
  ): Promise<PresignedUploadResponse> {
    const config = MEDIA_TYPE_CONFIG[type];

    // Validate file extension
    const extension = this.getFileExtension(fileName);
    if (!config.allowedExtensions.includes(extension.toLowerCase())) {
      throw new BadRequestException(
        `Invalid file extension. Allowed: ${config.allowedExtensions.join(', ')}`
      );
    }

    // Generate S3 key
    const s3Key = this.generateS3Key(tenantId, type, fileName);

    // Determine content type from extension
    const contentType = this.getContentTypeFromExtension(extension);

    // Generate presigned URL with 15 minute expiry for uploads
    const expiresIn = 900; // 15 minutes
    const uploadUrl = await getUploadSignedUrl(s3Key, contentType, expiresIn);

    auditLogger.info('Presigned upload URL generated', {
      action: 'media.presigned_url',
      tenantId,
      type,
      fileName,
      s3Key,
    });

    return {
      uploadUrl,
      key: s3Key,
      expiresIn,
    };
  }

  /**
   * Generates a unique S3 key for tenant-isolated storage
   *
   * Format: {tenantId}/media/{type}/{uuid}-{originalName}
   *
   * @param tenantId - Tenant UUID
   * @param type - Media type
   * @param originalName - Original file name
   * @returns S3 key
   */
  private generateS3Key(
    tenantId: string,
    type: MediaType,
    originalName: string
  ): string {
    const uuid = uuidv4();
    const sanitizedName = this.sanitizeFileName(originalName);
    return `${tenantId}/media/${type}/${uuid}-${sanitizedName}`;
  }

  /**
   * Sanitizes a file name for safe storage
   *
   * Removes potentially dangerous characters and limits length.
   *
   * @param fileName - Original file name
   * @returns Sanitized file name
   */
  private sanitizeFileName(fileName: string): string {
    // Remove path traversal attempts
    const baseName = fileName.split(/[/\\]/).pop() || fileName;

    // Remove or replace dangerous characters
    const sanitized = baseName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.+/g, '.')
      .replace(/_+/g, '_');

    // Limit length (keeping extension intact)
    const extension = this.getFileExtension(sanitized);
    const nameWithoutExt = sanitized.slice(0, -extension.length);
    const maxNameLength = 100;

    if (nameWithoutExt.length > maxNameLength) {
      return nameWithoutExt.slice(0, maxNameLength) + extension;
    }

    return sanitized;
  }

  /**
   * Gets the file extension including the dot
   *
   * @param fileName - File name
   * @returns File extension (e.g., '.jpg')
   */
  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot === -1 || lastDot === fileName.length - 1) {
      return '';
    }
    return fileName.slice(lastDot).toLowerCase();
  }

  /**
   * Gets the MIME type from a file extension
   *
   * @param extension - File extension (e.g., '.jpg')
   * @returns MIME type
   */
  private getContentTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.mp4': 'video/mp4',
      '.pdf': 'application/pdf',
    };
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Validates file content against expected magic bytes
   *
   * This is a critical security check to prevent MIME type spoofing attacks
   * where an attacker uploads a malicious file with a fake MIME type.
   *
   * @param buffer - File content buffer
   * @param expectedMagicBytes - Array of valid magic byte patterns
   * @returns True if file matches any expected pattern
   */
  private validateMagicBytes(
    buffer: Buffer,
    expectedMagicBytes: Array<{ bytes: number[]; offset: number }>
  ): boolean {
    if (buffer.length < 8) {
      return false;
    }

    return expectedMagicBytes.some(({ bytes, offset }) => {
      if (buffer.length < offset + bytes.length) {
        return false;
      }
      return bytes.every((byte, index) => buffer[offset + index] === byte);
    });
  }

  /**
   * Safely deletes a file from S3, catching any errors
   *
   * Used for cleanup operations where we don't want to throw on failure.
   *
   * @param key - S3 object key
   */
  private async safeDeleteFromS3(key: string): Promise<void> {
    try {
      await deleteFromS3(key);
    } catch (error) {
      logger.error('Failed to cleanup S3 file', { error, key });
    }
  }
}
