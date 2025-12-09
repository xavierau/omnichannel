"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const multer_1 = __importDefault(require("multer"));
const media_controller_1 = require("./media.controller");
const csrf_protection_1 = require("../../middleware/csrf-protection");
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const validate_dto_1 = require("../../middleware/validate-dto");
const require_tenant_1 = require("../../middleware/require-tenant");
const validate_uuid_1 = require("../../middleware/validate-uuid");
const dto_1 = require("./dto");
const router = (0, express_1.Router)();
const controller = tsyringe_1.container.resolve(media_controller_1.MediaController);
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
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
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
        }
        else {
            cb(new Error('Invalid file type'));
        }
    },
});
// All routes require authentication and tenant
router.use(authenticate_1.authenticate);
router.use(require_tenant_1.requireTenant);
/**
 * POST /upload
 * Upload a media file
 *
 * Requires: broadcasts:create:own permission
 * Body: multipart/form-data with 'file' and 'type' fields
 */
router.post('/upload', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('broadcasts', 'create', 'own'), upload.single('file'), controller.uploadMedia);
/**
 * GET /:id
 * Get media metadata with signed download URL
 *
 * Requires: broadcasts:read:own permission
 */
router.get('/:id', (0, authorize_1.requirePermission)('broadcasts', 'read', 'own'), (0, validate_uuid_1.validateUuid)(), controller.getMedia);
/**
 * DELETE /:id
 * Delete a media file
 *
 * Requires: broadcasts:delete:own permission
 */
router.delete('/:id', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('broadcasts', 'delete', 'own'), (0, validate_uuid_1.validateUuid)(), controller.deleteMedia);
/**
 * POST /presigned-url
 * Get a presigned URL for direct S3 upload
 *
 * Requires: broadcasts:create:own permission
 * Body: { type: MediaType, fileName: string }
 */
router.post('/presigned-url', csrf_protection_1.csrfValidateToken, (0, authorize_1.requirePermission)('broadcasts', 'create', 'own'), (0, validate_dto_1.validateDto)(dto_1.PresignedUrlDto), controller.getPresignedUrl);
exports.default = router;
