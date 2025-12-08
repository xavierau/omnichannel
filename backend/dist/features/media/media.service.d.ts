import { MediaRepository } from './media.repository';
import { Media, MediaType } from './media.entity';
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
export declare class MediaService {
    private mediaRepository;
    constructor(mediaRepository: MediaRepository);
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
    uploadMedia(file: UploadedFile, type: MediaType, tenantId: string, userId: string): Promise<MediaWithUrl>;
    /**
     * Gets a media record with a signed download URL
     *
     * @param id - Media UUID
     * @param tenantId - Tenant UUID for authorization
     * @returns Media record with download URL
     */
    getMedia(id: string, tenantId: string): Promise<MediaWithUrl>;
    /**
     * Deletes a media file from S3 and removes the database record
     *
     * @param id - Media UUID
     * @param tenantId - Tenant UUID for authorization
     */
    deleteMedia(id: string, tenantId: string): Promise<void>;
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
    getPresignedUploadUrl(type: MediaType, fileName: string, tenantId: string): Promise<PresignedUploadResponse>;
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
    private generateS3Key;
    /**
     * Sanitizes a file name for safe storage
     *
     * Removes potentially dangerous characters and limits length.
     *
     * @param fileName - Original file name
     * @returns Sanitized file name
     */
    private sanitizeFileName;
    /**
     * Gets the file extension including the dot
     *
     * @param fileName - File name
     * @returns File extension (e.g., '.jpg')
     */
    private getFileExtension;
    /**
     * Gets the MIME type from a file extension
     *
     * @param extension - File extension (e.g., '.jpg')
     * @returns MIME type
     */
    private getContentTypeFromExtension;
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
    private validateMagicBytes;
    /**
     * Safely deletes a file from S3, catching any errors
     *
     * Used for cleanup operations where we don't want to throw on failure.
     *
     * @param key - S3 object key
     */
    private safeDeleteFromS3;
}
