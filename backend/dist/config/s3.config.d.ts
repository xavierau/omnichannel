import { S3Client } from '@aws-sdk/client-s3';
declare const S3_BUCKET: string;
/**
 * S3 Client instance
 * Credentials are loaded from environment variables:
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 */
export declare const s3Client: S3Client;
/**
 * S3 bucket name
 */
export { S3_BUCKET };
/**
 * Generates a presigned URL for uploading a file directly to S3
 *
 * @param key - S3 object key (path)
 * @param contentType - MIME type of the file
 * @param expiresIn - URL expiry time in seconds (default: from env or 3600)
 * @returns Presigned upload URL
 */
export declare function getUploadSignedUrl(key: string, contentType: string, expiresIn?: number): Promise<string>;
/**
 * Generates a presigned URL for downloading a file from S3
 *
 * @param key - S3 object key (path)
 * @param expiresIn - URL expiry time in seconds (default: from env or 3600)
 * @returns Presigned download URL
 */
export declare function getDownloadSignedUrl(key: string, expiresIn?: number): Promise<string>;
/**
 * Uploads a file to S3
 *
 * @param key - S3 object key (path)
 * @param body - File content as Buffer
 * @param contentType - MIME type of the file
 */
export declare function uploadToS3(key: string, body: Buffer, contentType: string): Promise<void>;
/**
 * Deletes a file from S3
 *
 * @param key - S3 object key (path)
 */
export declare function deleteFromS3(key: string): Promise<void>;
