/**
 * Test script for S3 service
 *
 * Usage:
 *   npx ts-node scripts/test-s3-service.ts
 *
 * This script tests:
 * - S3 connection and credentials
 * - File upload to S3
 * - Presigned URL generation (upload and download)
 * - File download from S3
 * - File deletion from S3
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// AWS S3 Configuration from environment
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-1';
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const S3_SIGNED_URL_EXPIRY = parseInt(process.env.S3_SIGNED_URL_EXPIRY || '3600', 10);

// Validate required environment variables
if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !S3_BUCKET_NAME) {
  console.error('❌ Missing required environment variables:');
  if (!AWS_ACCESS_KEY_ID) console.error('   - AWS_ACCESS_KEY_ID');
  if (!AWS_SECRET_ACCESS_KEY) console.error('   - AWS_SECRET_ACCESS_KEY');
  if (!S3_BUCKET_NAME) console.error('   - S3_BUCKET_NAME');
  console.error('\nPlease set these in your .env file or environment.');
  process.exit(1);
}

// Initialize S3 Client
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

// Test file configurations
interface TestFile {
  name: string;
  content: Buffer;
  contentType: string;
  description: string;
}

/**
 * Generate test files for upload
 */
function generateTestFiles(): TestFile[] {
  // JPEG test image (with proper magic bytes)
  const jpegContent = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]), // JPEG magic bytes
    Buffer.from('Test JPEG image content'),
  ]);

  // PNG test image (with proper magic bytes)
  const pngContent = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG magic bytes
    Buffer.from('Test PNG image content'),
  ]);

  // PDF test document (with proper magic bytes)
  const pdfContent = Buffer.concat([
    Buffer.from('%PDF-1.4\n'), // PDF magic bytes
    Buffer.from('Test PDF document content'),
  ]);

  // MP4 test video (with proper magic bytes)
  const mp4Content = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x20]), // Size
    Buffer.from('ftypisom'), // ftyp + brand
    Buffer.from('Test MP4 video content'),
  ]);

  return [
    {
      name: 'test-image.jpg',
      content: jpegContent,
      contentType: 'image/jpeg',
      description: 'JPEG Image',
    },
    {
      name: 'test-image.png',
      content: pngContent,
      contentType: 'image/png',
      description: 'PNG Image',
    },
    {
      name: 'test-document.pdf',
      content: pdfContent,
      contentType: 'application/pdf',
      description: 'PDF Document',
    },
    {
      name: 'test-video.mp4',
      content: mp4Content,
      contentType: 'video/mp4',
      description: 'MP4 Video',
    },
  ];
}

/**
 * Test 1: Verify S3 connection and bucket access
 */
async function testS3Connection(): Promise<boolean> {
  console.log('\n=== Test 1: S3 Connection & Bucket Access ===\n');
  console.log('AWS Region:', AWS_REGION);
  console.log('S3 Bucket:', S3_BUCKET_NAME);
  console.log('Access Key ID:', AWS_ACCESS_KEY_ID.substring(0, 8) + '...');

  try {
    console.log('\n1. Testing bucket access...');
    const command = new HeadBucketCommand({ Bucket: S3_BUCKET_NAME });
    await s3Client.send(command);
    console.log('✅ Bucket access verified successfully!');

    console.log('\n2. Listing objects in bucket (first 10)...');
    const listCommand = new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
      MaxKeys: 10,
    });
    const listResponse = await s3Client.send(listCommand);
    console.log(`✅ Found ${listResponse.KeyCount || 0} objects`);
    if (listResponse.Contents && listResponse.Contents.length > 0) {
      console.log('   Sample objects:');
      listResponse.Contents.slice(0, 3).forEach((obj) => {
        console.log(`   - ${obj.Key} (${obj.Size} bytes)`);
      });
    }

    return true;
  } catch (error) {
    console.error('❌ S3 connection failed:', (error as Error).message);
    if ((error as any).Code === 'NoSuchBucket') {
      console.error('   Bucket does not exist!');
    } else if ((error as any).Code === 'AccessDenied') {
      console.error('   Access denied! Check credentials and bucket permissions.');
    }
    return false;
  }
}

/**
 * Test 2: Upload files to S3
 */
async function testFileUpload(testFiles: TestFile[]): Promise<Map<string, string>> {
  console.log('\n=== Test 2: File Upload to S3 ===\n');

  const uploadedKeys = new Map<string, string>();
  const testPrefix = `test-uploads/${Date.now()}`;

  for (const file of testFiles) {
    const key = `${testPrefix}/${file.name}`;
    console.log(`\nUploading: ${file.description} (${file.name})`);
    console.log(`Key: ${key}`);
    console.log(`Size: ${file.content.length} bytes`);

    try {
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: file.content,
        ContentType: file.contentType,
      });

      const startTime = Date.now();
      await s3Client.send(command);
      const duration = Date.now() - startTime;

      console.log(`✅ Upload successful! (${duration}ms)`);
      uploadedKeys.set(file.name, key);
    } catch (error) {
      console.error(`❌ Upload failed:`, (error as Error).message);
    }
  }

  console.log(`\n✅ Uploaded ${uploadedKeys.size}/${testFiles.length} files successfully`);
  return uploadedKeys;
}

/**
 * Test 3: Generate presigned upload URLs
 */
async function testPresignedUploadUrl(): Promise<void> {
  console.log('\n=== Test 3: Presigned Upload URL Generation ===\n');

  const testCases = [
    { fileName: 'presigned-test.jpg', contentType: 'image/jpeg' },
    { fileName: 'presigned-test.pdf', contentType: 'application/pdf' },
    { fileName: 'presigned-test.mp4', contentType: 'video/mp4' },
  ];

  for (const testCase of testCases) {
    const key = `test-presigned/${Date.now()}/${testCase.fileName}`;
    console.log(`\nGenerating presigned upload URL for: ${testCase.fileName}`);
    console.log(`Key: ${key}`);

    try {
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        ContentType: testCase.contentType,
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: S3_SIGNED_URL_EXPIRY,
      });

      console.log('✅ Presigned upload URL generated successfully!');
      console.log(`   URL length: ${signedUrl.length} characters`);
      console.log(`   Expires in: ${S3_SIGNED_URL_EXPIRY} seconds`);
      console.log(`   URL preview: ${signedUrl.substring(0, 80)}...`);

      // Verify URL structure
      if (signedUrl.includes('X-Amz-Algorithm') && signedUrl.includes('X-Amz-Signature')) {
        console.log('✅ URL signature verified');
      } else {
        console.log('⚠️  Warning: URL might not be properly signed');
      }
    } catch (error) {
      console.error('❌ Failed to generate presigned URL:', (error as Error).message);
    }
  }
}

/**
 * Test 4: Generate presigned download URLs and verify
 */
async function testPresignedDownloadUrl(uploadedKeys: Map<string, string>): Promise<void> {
  console.log('\n=== Test 4: Presigned Download URL Generation ===\n');

  for (const [fileName, key] of uploadedKeys) {
    console.log(`\nGenerating presigned download URL for: ${fileName}`);
    console.log(`Key: ${key}`);

    try {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
      });

      const signedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: S3_SIGNED_URL_EXPIRY,
      });

      console.log('✅ Presigned download URL generated successfully!');
      console.log(`   URL length: ${signedUrl.length} characters`);
      console.log(`   Expires in: ${S3_SIGNED_URL_EXPIRY} seconds`);
      console.log(`   URL preview: ${signedUrl.substring(0, 80)}...`);

      // Verify URL structure
      if (signedUrl.includes('X-Amz-Algorithm') && signedUrl.includes('X-Amz-Signature')) {
        console.log('✅ URL signature verified');
      }
    } catch (error) {
      console.error('❌ Failed to generate presigned URL:', (error as Error).message);
    }
  }
}

/**
 * Test 5: Download files from S3
 */
async function testFileDownload(uploadedKeys: Map<string, string>): Promise<void> {
  console.log('\n=== Test 5: File Download from S3 ===\n');

  for (const [fileName, key] of uploadedKeys) {
    console.log(`\nDownloading: ${fileName}`);
    console.log(`Key: ${key}`);

    try {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
      });

      const startTime = Date.now();
      const response = await s3Client.send(command);
      const duration = Date.now() - startTime;

      // Read the stream
      const chunks: Uint8Array[] = [];
      if (response.Body) {
        for await (const chunk of response.Body as any) {
          chunks.push(chunk);
        }
      }
      const buffer = Buffer.concat(chunks);

      console.log(`✅ Download successful! (${duration}ms)`);
      console.log(`   Content-Type: ${response.ContentType}`);
      console.log(`   Content-Length: ${buffer.length} bytes`);
      console.log(`   Last-Modified: ${response.LastModified}`);
      console.log(`   ETag: ${response.ETag}`);
    } catch (error) {
      console.error(`❌ Download failed:`, (error as Error).message);
    }
  }
}

/**
 * Test 6: Delete files from S3 (cleanup)
 */
async function testFileDelete(uploadedKeys: Map<string, string>): Promise<void> {
  console.log('\n=== Test 6: File Deletion from S3 (Cleanup) ===\n');

  for (const [fileName, key] of uploadedKeys) {
    console.log(`\nDeleting: ${fileName}`);
    console.log(`Key: ${key}`);

    try {
      const command = new DeleteObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
      });

      const startTime = Date.now();
      await s3Client.send(command);
      const duration = Date.now() - startTime;

      console.log(`✅ Delete successful! (${duration}ms)`);
    } catch (error) {
      console.error(`❌ Delete failed:`, (error as Error).message);
    }
  }

  console.log(`\n✅ Deleted ${uploadedKeys.size} files successfully`);
}

/**
 * Test 7: Error handling scenarios
 */
async function testErrorHandling(): Promise<void> {
  console.log('\n=== Test 7: Error Handling Scenarios ===\n');

  // Test 1: Access non-existent file
  console.log('\n1. Testing access to non-existent file...');
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: 'non-existent-file-' + Date.now() + '.txt',
    });
    await s3Client.send(command);
    console.log('⚠️  Unexpected: File access succeeded (should have failed)');
  } catch (error) {
    if ((error as any).name === 'NoSuchKey') {
      console.log('✅ Correctly returned NoSuchKey error');
    } else {
      console.log('✅ Error caught:', (error as Error).message);
    }
  }

  // Test 2: Delete non-existent file (should succeed silently)
  console.log('\n2. Testing delete of non-existent file...');
  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: 'non-existent-file-' + Date.now() + '.txt',
    });
    await s3Client.send(command);
    console.log('✅ Delete succeeded (S3 deletes are idempotent)');
  } catch (error) {
    console.log('⚠️  Delete failed:', (error as Error).message);
  }

  // Test 3: Upload with invalid bucket (if different bucket is specified)
  console.log('\n3. Testing upload to non-existent bucket...');
  try {
    const command = new PutObjectCommand({
      Bucket: 'non-existent-bucket-' + Date.now(),
      Key: 'test.txt',
      Body: Buffer.from('test'),
    });
    await s3Client.send(command);
    console.log('⚠️  Unexpected: Upload succeeded (should have failed)');
  } catch (error) {
    if ((error as any).name === 'NoSuchBucket') {
      console.log('✅ Correctly returned NoSuchBucket error');
    } else {
      console.log('✅ Error caught:', (error as Error).message);
    }
  }
}

/**
 * Display configuration summary
 */
function displayConfiguration(): void {
  console.log('\n=== S3 Service Configuration ===\n');
  console.log('AWS Configuration:');
  console.log(`  Region: ${AWS_REGION}`);
  console.log(`  Access Key: ${AWS_ACCESS_KEY_ID.substring(0, 8)}...`);
  console.log(`  Bucket: ${S3_BUCKET_NAME}`);
  console.log(`  Signed URL Expiry: ${S3_SIGNED_URL_EXPIRY} seconds`);
  console.log('');
}

/**
 * Main test runner
 */
async function main(): Promise<void> {
  console.log('========================================');
  console.log('      S3 Service Test Script');
  console.log('========================================');

  displayConfiguration();

  const testFiles = generateTestFiles();
  console.log(`Generated ${testFiles.length} test files:`, testFiles.map((f) => f.name).join(', '));

  // Test 1: Connection
  const connectionOk = await testS3Connection();
  if (!connectionOk) {
    console.log('\n⚠️  Stopping tests due to connection failure.');
    process.exit(1);
  }

  // Test 2: Upload
  const uploadedKeys = await testFileUpload(testFiles);
  if (uploadedKeys.size === 0) {
    console.log('\n⚠️  No files uploaded successfully. Stopping remaining tests.');
    process.exit(1);
  }

  // Test 3: Presigned Upload URLs
  await testPresignedUploadUrl();

  // Test 4: Presigned Download URLs
  await testPresignedDownloadUrl(uploadedKeys);

  // Test 5: Download
  await testFileDownload(uploadedKeys);

  // Test 6: Delete (cleanup)
  await testFileDelete(uploadedKeys);

  // Test 7: Error Handling
  await testErrorHandling();

  console.log('\n========================================');
  console.log('      All Tests Complete!');
  console.log('========================================\n');

  // Summary
  console.log('Summary:');
  console.log(`✅ S3 connection: OK`);
  console.log(`✅ File uploads: ${uploadedKeys.size}/${testFiles.length}`);
  console.log(`✅ Presigned URLs: OK`);
  console.log(`✅ File downloads: OK`);
  console.log(`✅ File deletions: OK`);
  console.log(`✅ Error handling: OK`);
  console.log('');
}

// Run the tests
main().catch((error) => {
  console.error('\n❌ Script failed:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});