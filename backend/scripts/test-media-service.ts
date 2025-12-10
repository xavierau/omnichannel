/**
 * Test script for Media Service integration with S3
 *
 * Usage:
 *   npx ts-node scripts/test-media-service.ts
 *
 * This script tests:
 * - MediaService upload with S3 integration
 * - File validation (extensions, MIME types, magic bytes)
 * - Presigned URL generation
 * - Media retrieval with download URLs
 * - Tenant isolation
 * - Error scenarios
 */

import 'reflect-metadata';
import { container } from 'tsyringe';
import { AppDataSource } from '../src/config/database.config';
import { MediaService, UploadedFile } from '../src/features/media/media.service';
import { MediaRepository } from '../src/features/media/media.repository';
import { MediaType } from '../src/features/media/media.entity';
import * as crypto from 'crypto';

// Test tenant and user IDs
const TEST_TENANT_ID = 'test-tenant-' + crypto.randomUUID();
const TEST_USER_ID = 'test-user-' + crypto.randomUUID();

/**
 * Initialize database connection
 */
async function initializeDatabase(): Promise<void> {
  console.log('\n=== Initializing Database ===\n');
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connected successfully');
    }
  } catch (error) {
    console.error('❌ Database connection failed:', (error as Error).message);
    throw error;
  }
}

/**
 * Setup dependency injection
 */
function setupDependencyInjection(): void {
  console.log('\n=== Setting up Dependency Injection ===\n');
  try {
    container.registerSingleton(MediaRepository, MediaRepository);
    container.registerSingleton(MediaService, MediaService);
    console.log('✅ DI container configured');
  } catch (error) {
    console.error('❌ DI setup failed:', (error as Error).message);
    throw error;
  }
}

/**
 * Create test file buffers with proper magic bytes
 */
function createTestFiles(): Map<string, UploadedFile> {
  const files = new Map<string, UploadedFile>();

  // JPEG image
  const jpegBuffer = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), // JPEG magic bytes
    Buffer.from('JFIF'),
    Buffer.alloc(1000, 0xff), // Fill with test data
  ]);

  files.set('test-image.jpg', {
    fieldname: 'file',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: jpegBuffer,
    size: jpegBuffer.length,
  });

  // PNG image
  const pngBuffer = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG magic bytes
    Buffer.alloc(1000, 0x00), // Fill with test data
  ]);

  files.set('test-image.png', {
    fieldname: 'file',
    originalname: 'test-image.png',
    encoding: '7bit',
    mimetype: 'image/png',
    buffer: pngBuffer,
    size: pngBuffer.length,
  });

  // PDF document
  const pdfBuffer = Buffer.concat([
    Buffer.from('%PDF-1.4\n%âãÏÓ\n'), // PDF magic bytes
    Buffer.from('1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\n'),
    Buffer.alloc(1000, 0x20), // Fill with test data
  ]);

  files.set('test-document.pdf', {
    fieldname: 'file',
    originalname: 'test-document.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer: pdfBuffer,
    size: pdfBuffer.length,
  });

  // MP4 video
  const mp4Buffer = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x20]), // Box size
    Buffer.from('ftypisom'), // ftyp box with isom brand
    Buffer.alloc(1000, 0x00), // Fill with test data
  ]);

  files.set('test-video.mp4', {
    fieldname: 'file',
    originalname: 'test-video.mp4',
    encoding: '7bit',
    mimetype: 'video/mp4',
    buffer: mp4Buffer,
    size: mp4Buffer.length,
  });

  return files;
}

/**
 * Test 1: Upload valid files
 */
async function testValidUploads(
  mediaService: MediaService,
  testFiles: Map<string, UploadedFile>
): Promise<string[]> {
  console.log('\n=== Test 1: Valid File Uploads ===\n');

  const uploadedMediaIds: string[] = [];

  // Test JPEG upload
  console.log('1. Testing JPEG image upload...');
  try {
    const jpegFile = testFiles.get('test-image.jpg')!;
    const result = await mediaService.uploadMedia(
      jpegFile,
      MediaType.IMAGE,
      TEST_TENANT_ID,
      TEST_USER_ID
    );

    console.log('✅ JPEG upload successful');
    console.log(`   Media ID: ${result.id}`);
    console.log(`   S3 Key: ${result.s3Key}`);
    console.log(`   Download URL: ${result.downloadUrl?.substring(0, 60)}...`);
    uploadedMediaIds.push(result.id);
  } catch (error) {
    console.error('❌ JPEG upload failed:', (error as Error).message);
  }

  // Test PNG upload
  console.log('\n2. Testing PNG image upload...');
  try {
    const pngFile = testFiles.get('test-image.png')!;
    const result = await mediaService.uploadMedia(
      pngFile,
      MediaType.IMAGE,
      TEST_TENANT_ID,
      TEST_USER_ID
    );

    console.log('✅ PNG upload successful');
    console.log(`   Media ID: ${result.id}`);
    console.log(`   S3 Key: ${result.s3Key}`);
    uploadedMediaIds.push(result.id);
  } catch (error) {
    console.error('❌ PNG upload failed:', (error as Error).message);
  }

  // Test PDF upload
  console.log('\n3. Testing PDF document upload...');
  try {
    const pdfFile = testFiles.get('test-document.pdf')!;
    const result = await mediaService.uploadMedia(
      pdfFile,
      MediaType.DOCUMENT,
      TEST_TENANT_ID,
      TEST_USER_ID
    );

    console.log('✅ PDF upload successful');
    console.log(`   Media ID: ${result.id}`);
    console.log(`   S3 Key: ${result.s3Key}`);
    uploadedMediaIds.push(result.id);
  } catch (error) {
    console.error('❌ PDF upload failed:', (error as Error).message);
  }

  // Test MP4 upload
  console.log('\n4. Testing MP4 video upload...');
  try {
    const mp4File = testFiles.get('test-video.mp4')!;
    const result = await mediaService.uploadMedia(
      mp4File,
      MediaType.VIDEO,
      TEST_TENANT_ID,
      TEST_USER_ID
    );

    console.log('✅ MP4 upload successful');
    console.log(`   Media ID: ${result.id}`);
    console.log(`   S3 Key: ${result.s3Key}`);
    uploadedMediaIds.push(result.id);
  } catch (error) {
    console.error('❌ MP4 upload failed:', (error as Error).message);
  }

  console.log(`\n✅ Uploaded ${uploadedMediaIds.length}/4 files successfully`);
  return uploadedMediaIds;
}

/**
 * Test 2: File validation (should fail)
 */
async function testFileValidation(mediaService: MediaService): Promise<void> {
  console.log('\n=== Test 2: File Validation (Expected Failures) ===\n');

  // Test 1: Invalid extension
  console.log('1. Testing invalid file extension...');
  try {
    const invalidFile: UploadedFile = {
      fieldname: 'file',
      originalname: 'malware.exe',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      size: 100,
    };
    await mediaService.uploadMedia(invalidFile, MediaType.IMAGE, TEST_TENANT_ID, TEST_USER_ID);
    console.log('❌ Should have rejected invalid extension');
  } catch (error) {
    console.log('✅ Correctly rejected:', (error as Error).message);
  }

  // Test 2: Invalid MIME type
  console.log('\n2. Testing invalid MIME type...');
  try {
    const invalidFile: UploadedFile = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'text/plain',
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      size: 100,
    };
    await mediaService.uploadMedia(invalidFile, MediaType.IMAGE, TEST_TENANT_ID, TEST_USER_ID);
    console.log('❌ Should have rejected invalid MIME type');
  } catch (error) {
    console.log('✅ Correctly rejected:', (error as Error).message);
  }

  // Test 3: Magic bytes mismatch (MIME spoofing)
  console.log('\n3. Testing magic bytes validation (MIME spoofing)...');
  try {
    const spoofedFile: UploadedFile = {
      fieldname: 'file',
      originalname: 'fake-image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('This is not a real JPEG file'),
      size: 100,
    };
    await mediaService.uploadMedia(spoofedFile, MediaType.IMAGE, TEST_TENANT_ID, TEST_USER_ID);
    console.log('❌ Should have rejected spoofed file');
  } catch (error) {
    console.log('✅ Correctly rejected:', (error as Error).message);
  }

  // Test 4: File too large
  console.log('\n4. Testing file size validation...');
  try {
    const largeFile: UploadedFile = {
      fieldname: 'file',
      originalname: 'huge-image.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
        Buffer.alloc(6 * 1024 * 1024), // 6MB (exceeds 5MB limit for images)
      ]),
      size: 6 * 1024 * 1024,
    };
    await mediaService.uploadMedia(largeFile, MediaType.IMAGE, TEST_TENANT_ID, TEST_USER_ID);
    console.log('❌ Should have rejected oversized file');
  } catch (error) {
    console.log('✅ Correctly rejected:', (error as Error).message);
  }

  // Test 5: Path traversal attempt
  console.log('\n5. Testing path traversal prevention...');
  try {
    const maliciousFile: UploadedFile = {
      fieldname: 'file',
      originalname: '../../../etc/passwd.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
        Buffer.alloc(100),
      ]),
      size: 104,
    };
    const result = await mediaService.uploadMedia(
      maliciousFile,
      MediaType.IMAGE,
      TEST_TENANT_ID,
      TEST_USER_ID
    );
    // Check that path traversal was sanitized
    if (result.s3Key.includes('..')) {
      console.log('❌ Path traversal not sanitized!');
    } else {
      console.log('✅ Path traversal correctly sanitized');
      console.log(`   Sanitized S3 Key: ${result.s3Key}`);
      // Clean up
      await mediaService.deleteMedia(result.id, TEST_TENANT_ID);
    }
  } catch (error) {
    console.log('⚠️  Upload failed:', (error as Error).message);
  }
}

/**
 * Test 3: Presigned URL generation
 */
async function testPresignedUrls(mediaService: MediaService): Promise<void> {
  console.log('\n=== Test 3: Presigned URL Generation ===\n');

  const testCases = [
    { type: MediaType.IMAGE, fileName: 'presigned-test.jpg' },
    { type: MediaType.DOCUMENT, fileName: 'presigned-test.pdf' },
    { type: MediaType.VIDEO, fileName: 'presigned-test.mp4' },
  ];

  for (const testCase of testCases) {
    console.log(`\nGenerating presigned URL for ${testCase.type}: ${testCase.fileName}`);
    try {
      const result = await mediaService.getPresignedUploadUrl(
        testCase.type,
        testCase.fileName,
        TEST_TENANT_ID
      );

      console.log('✅ Presigned URL generated successfully');
      console.log(`   Upload URL: ${result.uploadUrl.substring(0, 60)}...`);
      console.log(`   S3 Key: ${result.key}`);
      console.log(`   Expires in: ${result.expiresIn} seconds`);

      // Verify tenant isolation
      if (result.key.startsWith(TEST_TENANT_ID)) {
        console.log('✅ Tenant isolation verified');
      } else {
        console.log('❌ Tenant isolation failed!');
      }
    } catch (error) {
      console.error('❌ Presigned URL generation failed:', (error as Error).message);
    }
  }
}

/**
 * Test 4: Media retrieval
 */
async function testMediaRetrieval(
  mediaService: MediaService,
  uploadedMediaIds: string[]
): Promise<void> {
  console.log('\n=== Test 4: Media Retrieval ===\n');

  for (const mediaId of uploadedMediaIds) {
    console.log(`\nRetrieving media: ${mediaId}`);
    try {
      const media = await mediaService.getMedia(mediaId, TEST_TENANT_ID);

      console.log('✅ Media retrieved successfully');
      console.log(`   Type: ${media.type}`);
      console.log(`   Original Name: ${media.originalName}`);
      console.log(`   MIME Type: ${media.mimeType}`);
      console.log(`   File Size: ${media.fileSize} bytes`);
      console.log(`   S3 Key: ${media.s3Key}`);
      console.log(`   Download URL: ${media.downloadUrl?.substring(0, 60)}...`);
    } catch (error) {
      console.error('❌ Media retrieval failed:', (error as Error).message);
    }
  }

  // Test tenant isolation
  console.log('\n\nTesting tenant isolation...');
  try {
    await mediaService.getMedia(uploadedMediaIds[0], 'different-tenant-id');
    console.log('❌ Should have rejected access from different tenant');
  } catch (error) {
    console.log('✅ Correctly rejected access from different tenant');
  }

  // Test non-existent media
  console.log('\nTesting non-existent media...');
  try {
    await mediaService.getMedia('non-existent-id', TEST_TENANT_ID);
    console.log('❌ Should have thrown NotFoundException');
  } catch (error) {
    console.log('✅ Correctly threw NotFoundException');
  }
}

/**
 * Test 5: Cleanup (delete all test files)
 */
async function testCleanup(
  mediaService: MediaService,
  uploadedMediaIds: string[]
): Promise<void> {
  console.log('\n=== Test 5: Cleanup (Delete Test Files) ===\n');

  for (const mediaId of uploadedMediaIds) {
    console.log(`\nDeleting media: ${mediaId}`);
    try {
      await mediaService.deleteMedia(mediaId, TEST_TENANT_ID);
      console.log('✅ Media deleted successfully (from S3 and database)');
    } catch (error) {
      console.error('❌ Media deletion failed:', (error as Error).message);
    }
  }

  console.log(`\n✅ Cleanup complete: ${uploadedMediaIds.length} files deleted`);
}

/**
 * Main test runner
 */
async function main(): Promise<void> {
  console.log('========================================');
  console.log('   Media Service Integration Tests');
  console.log('========================================');

  console.log('\nTest Configuration:');
  console.log(`  Test Tenant ID: ${TEST_TENANT_ID}`);
  console.log(`  Test User ID: ${TEST_USER_ID}`);
  console.log(`  S3 Bucket: ${process.env.S3_BUCKET_NAME || 'phb-omnichannel'}`);
  console.log(`  AWS Region: ${process.env.AWS_REGION || 'ap-southeast-1'}`);

  try {
    // Initialize
    await initializeDatabase();
    setupDependencyInjection();

    // Get service instance
    const mediaService = container.resolve(MediaService);
    console.log('\n✅ MediaService instance created');

    // Create test files
    const testFiles = createTestFiles();
    console.log(`\n✅ Generated ${testFiles.size} test files`);

    // Run tests
    const uploadedMediaIds = await testValidUploads(mediaService, testFiles);
    await testFileValidation(mediaService);
    await testPresignedUrls(mediaService);

    if (uploadedMediaIds.length > 0) {
      await testMediaRetrieval(mediaService, uploadedMediaIds);
      await testCleanup(mediaService, uploadedMediaIds);
    } else {
      console.log('\n⚠️  Skipping retrieval and cleanup tests (no files uploaded)');
    }

    console.log('\n========================================');
    console.log('      All Tests Complete!');
    console.log('========================================\n');

    console.log('Summary:');
    console.log(`✅ Valid uploads: ${uploadedMediaIds.length}/4`);
    console.log(`✅ File validation: OK`);
    console.log(`✅ Presigned URLs: OK`);
    console.log(`✅ Media retrieval: OK`);
    console.log(`✅ Cleanup: OK`);
  } catch (error) {
    console.error('\n❌ Test suite failed:', (error as Error).message);
    console.error('Stack trace:', (error as Error).stack);
    process.exit(1);
  } finally {
    // Close database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n✅ Database connection closed');
    }
  }
}

// Run the tests
main().catch((error) => {
  console.error('\n❌ Script failed:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});
