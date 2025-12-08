"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3_BUCKET = exports.s3Client = void 0;
exports.getUploadSignedUrl = getUploadSignedUrl;
exports.getDownloadSignedUrl = getDownloadSignedUrl;
exports.uploadToS3 = uploadToS3;
exports.deleteFromS3 = deleteFromS3;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const logger_config_1 = require("./logger.config");
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
exports.S3_BUCKET = S3_BUCKET;
const DEFAULT_SIGNED_URL_EXPIRY = parseInt(process.env.S3_SIGNED_URL_EXPIRY || '3600', 10);
/**
 * S3 Client instance
 * Credentials are loaded from environment variables:
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 */
exports.s3Client = new client_s3_1.S3Client({
    region: AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});
/**
 * Generates a presigned URL for uploading a file directly to S3
 *
 * @param key - S3 object key (path)
 * @param contentType - MIME type of the file
 * @param expiresIn - URL expiry time in seconds (default: from env or 3600)
 * @returns Presigned upload URL
 */
async function getUploadSignedUrl(key, contentType, expiresIn = DEFAULT_SIGNED_URL_EXPIRY) {
    const command = new client_s3_1.PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        ContentType: contentType,
    });
    const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(exports.s3Client, command, { expiresIn });
    logger_config_1.logger.debug('Generated presigned upload URL', {
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
async function getDownloadSignedUrl(key, expiresIn = DEFAULT_SIGNED_URL_EXPIRY) {
    const command = new client_s3_1.GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
    });
    const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(exports.s3Client, command, { expiresIn });
    logger_config_1.logger.debug('Generated presigned download URL', {
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
async function uploadToS3(key, body, contentType) {
    const command = new client_s3_1.PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
    });
    await exports.s3Client.send(command);
    logger_config_1.logger.info('File uploaded to S3', {
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
async function deleteFromS3(key) {
    const command = new client_s3_1.DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
    });
    await exports.s3Client.send(command);
    logger_config_1.logger.info('File deleted from S3', { key });
}
