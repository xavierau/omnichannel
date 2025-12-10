import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { MediaService, UploadedFile } from './media.service';
import { asyncHandler } from '@middleware/async-handler';
import { BadRequestException } from '@shared/exceptions/http-exceptions';
import { MediaType } from './media.entity';
import { PresignedUrlDto } from './dto/presigned-url.dto';

/**
 * Express Request with multer file
 */
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

/**
 * Media Controller
 *
 * Handles HTTP endpoints for media operations:
 * - POST /upload - Upload file via multipart/form-data
 * - GET /:id - Get media with signed download URL
 * - DELETE /:id - Delete media
 * - POST /presigned-url - Get presigned URL for direct S3 upload
 */
@singleton()
export class MediaController {
  constructor(@inject(MediaService) private mediaService: MediaService) {}

  /**
   * Upload a media file
   *
   * Accepts multipart/form-data with:
   * - file: The file to upload
   * - type: Media type (image, video, document)
   *
   * Returns the created media record with a signed download URL.
   */
  uploadMedia = asyncHandler(async (req: MulterRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const userId = req.user?.id;

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    if (!req.file) {
      throw new BadRequestException('No file uploaded');
    }

    const type = req.body.type as MediaType;
    if (!type || !Object.values(MediaType).includes(type)) {
      throw new BadRequestException(
        `Invalid media type. Must be one of: ${Object.values(MediaType).join(', ')}`
      );
    }

    // Convert multer file to our interface
    const uploadedFile: UploadedFile = {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      encoding: req.file.encoding,
      mimetype: req.file.mimetype,
      buffer: req.file.buffer,
      size: req.file.size,
    };

    const media = await this.mediaService.uploadMedia(
      uploadedFile,
      type,
      tenantId,
      userId
    );

    res.status(201).json({
      data: this.toMediaResponse(media),
    });
  });

  /**
   * Get a media record with signed download URL
   *
   * Returns the media metadata along with a time-limited download URL.
   */
  getMedia = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    const media = await this.mediaService.getMedia(id, tenantId);

    res.json({
      data: this.toMediaResponse(media),
    });
  });

  /**
   * Delete a media file
   *
   * Removes the file from S3 and deletes the database record.
   */
  deleteMedia = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const tenantId = req.tenantId!;

    await this.mediaService.deleteMedia(id, tenantId);

    res.status(204).send();
  });

  /**
   * Get a presigned URL for direct browser upload to S3
   *
   * Allows clients to upload directly to S3, which is more efficient
   * for large files as they don't need to go through the application server.
   *
   * Returns:
   * - uploadUrl: Presigned URL for PUT request
   * - downloadUrl: URL to access the uploaded file (same as uploadUrl without signature for now)
   * - key: S3 object key
   * - expiresIn: URL expiry in seconds
   */
  getPresignedUrl = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;

    const dto = req.body as { filename: string; contentType: string; conversationId?: string };

    // Get MediaType from content type
    let mediaType: MediaType;
    try {
      const presignedUrlDto = Object.assign(new PresignedUrlDto(), dto);
      mediaType = presignedUrlDto.getMediaType();
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }

    const result = await this.mediaService.getPresignedUploadUrl(
      mediaType,
      dto.filename,
      tenantId
    );

    // Return format expected by frontend
    res.json({
      uploadUrl: result.uploadUrl,
      downloadUrl: result.uploadUrl.split('?')[0], // Remove query params to get base S3 URL
      key: result.key,
      expiresIn: result.expiresIn,
    });
  });

  /**
   * Transforms media entity to API response format
   */
  private toMediaResponse(media: {
    id: string;
    tenantId: string;
    type: MediaType;
    originalName: string;
    mimeType: string;
    fileSize: number;
    s3Key: string;
    s3Bucket: string;
    uploadedBy: string;
    createdAt: Date;
    downloadUrl?: string;
  }) {
    return {
      id: media.id,
      type: media.type,
      originalName: media.originalName,
      mimeType: media.mimeType,
      fileSize: media.fileSize,
      uploadedBy: media.uploadedBy,
      createdAt: media.createdAt,
      downloadUrl: media.downloadUrl,
    };
  }
}
