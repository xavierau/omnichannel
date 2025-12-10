# Test Scripts

This directory contains various test scripts for testing service integrations.

## S3 Service Tests

### 1. Basic S3 Service Test (`test-s3-service.ts`)

Tests the raw S3 functionality without database integration.

**What it tests:**
- S3 connection and bucket access
- File uploads to S3
- Presigned URL generation (upload and download)
- File downloads from S3
- File deletions from S3
- Error handling scenarios

**Usage:**
```bash
cd backend
npx ts-node scripts/test-s3-service.ts
```

**Environment Variables:**
```bash
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-southeast-1
S3_BUCKET_NAME=your-bucket-name
S3_SIGNED_URL_EXPIRY=3600
```

**Expected Output:**
```
========================================
      S3 Service Test Script
========================================

=== S3 Configuration ===
AWS Configuration:
  Region: ap-southeast-1
  Access Key: AKIAWDZW...
  Bucket: phb-omnichannel
  Signed URL Expiry: 3600 seconds

=== Test 1: S3 Connection & Bucket Access ===
✅ Bucket access verified successfully!
...
```

---

### 2. Media Service Integration Test (`test-media-service.ts`)

Tests the full MediaService stack including database integration, file validation, and S3 operations.

**What it tests:**
- MediaService upload with S3 integration
- File validation:
  - Extension validation
  - MIME type validation
  - Magic bytes validation (anti-spoofing)
  - File size limits
  - Path traversal prevention
- Presigned URL generation
- Media retrieval with download URLs
- Tenant isolation
- Database and S3 cleanup

**Prerequisites:**
- PostgreSQL database running
- Database migrations applied
- Environment variables configured

**Usage:**
```bash
cd backend

# Ensure database is ready
npm run migration:run

# Run the test
npx ts-node scripts/test-media-service.ts
```

**Environment Variables:**
```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=omnichannel_db
DATABASE_USER=postgres
DATABASE_PASSWORD=password

# S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-southeast-1
S3_BUCKET_NAME=your-bucket-name
S3_SIGNED_URL_EXPIRY=3600
```

**Expected Output:**
```
========================================
   Media Service Integration Tests
========================================

Test Configuration:
  Test Tenant ID: test-tenant-abc123...
  Test User ID: test-user-def456...
  S3 Bucket: phb-omnichannel
  AWS Region: ap-southeast-1

=== Initializing Database ===
✅ Database connected successfully

=== Test 1: Valid File Uploads ===
✅ JPEG upload successful
   Media ID: 550e8400-e29b-41d4-a716-446655440000
   S3 Key: test-tenant-abc123/media/image/uuid-test-image.jpg
...
```

---

## Test File Formats

Both scripts test the following file formats:

### Images (5MB limit)
- **JPEG** (`.jpg`, `.jpeg`)
  - Magic bytes: `FF D8 FF`
  - MIME type: `image/jpeg`
- **PNG** (`.png`)
  - Magic bytes: `89 50 4E 47`
  - MIME type: `image/png`

### Videos (16MB limit)
- **MP4** (`.mp4`)
  - Magic bytes: `ftyp` at offset 4
  - MIME type: `video/mp4`

### Documents (100MB limit)
- **PDF** (`.pdf`)
  - Magic bytes: `%PDF`
  - MIME type: `application/pdf`

---

## Security Features Tested

### 1. Magic Bytes Validation
Prevents MIME type spoofing by validating file signatures:
```typescript
// Example: JPEG validation
if (!buffer.startsWith([0xFF, 0xD8, 0xFF])) {
  throw new Error('Invalid JPEG file');
}
```

### 2. Path Traversal Prevention
Sanitizes file names to prevent directory traversal:
```typescript
// Input:  "../../../etc/passwd.jpg"
// Output: "passwd.jpg"
```

### 3. Tenant Isolation
Ensures S3 keys include tenant ID:
```
{tenantId}/media/{type}/{uuid}-{filename}
```

### 4. File Size Limits
- Images: 5MB
- Videos: 16MB
- Documents: 100MB

---

## Troubleshooting

### "Access Denied" Error
Check your AWS credentials and S3 bucket permissions. Required S3 permissions:
- `s3:PutObject`
- `s3:GetObject`
- `s3:DeleteObject`
- `s3:ListBucket`

### "NoSuchBucket" Error
Verify the `S3_BUCKET_NAME` environment variable matches your actual bucket name.

### "Database Connection Failed"
Ensure PostgreSQL is running and accessible:
```bash
docker ps  # Check if postgres container is running
psql -h localhost -U postgres -d omnichannel_db  # Test connection
```

### Invalid Magic Bytes
If uploads fail with "File content does not match", ensure test files have proper file signatures:
```bash
# Check file signature
xxd -l 16 test-file.jpg
```

---

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Test S3 Service
  run: npx ts-node scripts/test-s3-service.ts
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    S3_BUCKET_NAME: ${{ secrets.S3_BUCKET_NAME }}
```

---

## Cleanup

Both scripts automatically clean up test files. If cleanup fails, manually delete test objects:

```bash
# List test objects
aws s3 ls s3://your-bucket/test-uploads/ --recursive
aws s3 ls s3://your-bucket/test-presigned/ --recursive

# Delete test objects
aws s3 rm s3://your-bucket/test-uploads/ --recursive
aws s3 rm s3://your-bucket/test-presigned/ --recursive
```

---

## Contributing

When adding new test scripts:
1. Follow the existing naming convention: `test-{service}-{feature}.ts`
2. Include proper error handling and cleanup
3. Add documentation to this README
4. Use environment variables for configuration
5. Include console output examples
