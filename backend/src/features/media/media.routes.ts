import { Router } from 'express';
import { container } from 'tsyringe';
import multer from 'multer';
import { MediaController } from './media.controller';
import { csrfValidateToken } from '@middleware/csrf-protection';
import { authenticate } from '@middleware/authenticate';
import { requirePermission } from '@middleware/authorize';
import { validateDto } from '@middleware/validate-dto';
import { requireTenant } from '@middleware/require-tenant';
import { validateUuid } from '@middleware/validate-uuid';
import { PresignedUrlDto } from './dto';

const router = Router();
const controller = container.resolve(MediaController);

/**
 * Multer configuration for memory storage
 *
 * We use memory storage to get the file as a buffer, which allows us to:
 * 1. Validate magic bytes before uploading to S3
 * 2. Upload directly to S3 without writing to disk
 *
 * File size limits are set to the maximum allowed (100MB for documents)
 * but the service will enforce type-specific limits.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max (for documents)
    files: 1, // Only allow single file upload
  },
  fileFilter: (_req, file, cb) => {
    // Basic MIME type check (more thorough validation happens in service)
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'video/mp4',
      'application/pdf',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// All routes require authentication and tenant
router.use(authenticate);
router.use(requireTenant);

/**
 * POST /upload
 * Upload a media file
 *
 * Requires: broadcasts:create:own permission
 * Body: multipart/form-data with 'file' and 'type' fields
 */
router.post(
  '/upload',
  csrfValidateToken,
  requirePermission('broadcasts', 'create', 'own'),
  upload.single('file'),
  controller.uploadMedia
);

/**
 * GET /:id
 * Get media metadata with signed download URL
 *
 * Requires: broadcasts:read:own permission
 */
router.get(
  '/:id',
  requirePermission('broadcasts', 'read', 'own'),
  validateUuid(),
  controller.getMedia
);

/**
 * DELETE /:id
 * Delete a media file
 *
 * Requires: broadcasts:delete:own permission
 */
router.delete(
  '/:id',
  csrfValidateToken,
  requirePermission('broadcasts', 'delete', 'own'),
  validateUuid(),
  controller.deleteMedia
);

/**
 * POST /presigned-url
 * Get a presigned URL for direct S3 upload
 *
 * Requires: broadcasts:create:own permission
 * Body: { type: MediaType, fileName: string }
 */
router.post(
  '/presigned-url',
  csrfValidateToken,
  requirePermission('broadcasts', 'create', 'own'),
  validateDto(PresignedUrlDto),
  controller.getPresignedUrl
);

export default router;
