import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from './logger.config';

/**
 * S3 Configuration
 *
 * Environment variables required:
 * - AWS_ACCESS_KEY_ID: AWS access key
 * - AWS_SECRET_ACCESS_KEY: AWS secret key
 * - AWS_REGION: AWS region (e.g., us-east-1)
 * - S3_BUCKET_NAME: S3 bucket name for media storage
 * - S3_SIGNED_URL_EXPIRY: Signed URL expiry in seconds (default: 3600)
 */

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET_NAME || '';
const DEFAULT_SIGNED_URL_EXPIRY = parseInt(process.env.S3_SIGNED_URL_EXPIRY || '3600', 10);

/**
 * S3 Client instance
 * Credentials are loaded from environment variables:
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 */
export const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

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
export async function getUploadSignedUrl(
  key: string,
  contentType: string,
  expiresIn: number = DEFAULT_SIGNED_URL_EXPIRY
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

  logger.debug('Generated presigned upload URL', {
    key,
    contentType,
    expiresIn,
  });

  return signedUrl;
}

/**
 * Generates a presigned URL for downloading a file from S3
 *
 * @param key - S3 object key (path)
 * @param expiresIn - URL expiry time in seconds (default: from env or 3600)
 * @returns Presigned download URL
 */
export async function getDownloadSignedUrl(
  key: string,
  expiresIn: number = DEFAULT_SIGNED_URL_EXPIRY
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

  logger.debug('Generated presigned download URL', {
    key,
    expiresIn,
  });

  return signedUrl;
}

/**
 * Uploads a file to S3
 *
 * @param key - S3 object key (path)
 * @param body - File content as Buffer
 * @param contentType - MIME type of the file
 */
export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);

  logger.info('File uploaded to S3', {
    key,
    contentType,
    size: body.length,
  });
}

/**
 * Deletes a file from S3
 *
 * @param key - S3 object key (path)
 */
export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  await s3Client.send(command);

  logger.info('File deleted from S3', { key });
}
