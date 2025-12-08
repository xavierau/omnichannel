import { Request, Response } from 'express';
import { MediaService } from './media.service';
/**
 * Media Controller
 *
 * Handles HTTP endpoints for media operations:
 * - POST /upload - Upload file via multipart/form-data
 * - GET /:id - Get media with signed download URL
 * - DELETE /:id - Delete media
 * - POST /presigned-url - Get presigned URL for direct S3 upload
 */
export declare class MediaController {
    private mediaService;
    constructor(mediaService: MediaService);
    /**
     * Upload a media file
     *
     * Accepts multipart/form-data with:
     * - file: The file to upload
     * - type: Media type (image, video, document)
     *
     * Returns the created media record with a signed download URL.
     */
    uploadMedia: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Get a media record with signed download URL
     *
     * Returns the media metadata along with a time-limited download URL.
     */
    getMedia: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Delete a media file
     *
     * Removes the file from S3 and deletes the database record.
     */
    deleteMedia: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Get a presigned URL for direct browser upload to S3
     *
     * Allows clients to upload directly to S3, which is more efficient
     * for large files as they don't need to go through the application server.
     *
     * Returns:
     * - uploadUrl: Presigned URL for PUT request
     * - key: S3 object key
     * - expiresIn: URL expiry in seconds
     */
    getPresignedUrl: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Transforms media entity to API response format
     */
    private toMediaResponse;
}
