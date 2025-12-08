"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const media_service_1 = require("../media.service");
const media_entity_1 = require("../media.entity");
const http_exceptions_1 = require("../../../shared/exceptions/http-exceptions");
// Mock the logger
jest.mock('../../../config/logger.config', () => ({
    auditLogger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));
// Mock the S3 config
jest.mock('../../../config/s3.config', () => ({
    uploadToS3: jest.fn(),
    deleteFromS3: jest.fn(),
    getDownloadSignedUrl: jest.fn(),
    getUploadSignedUrl: jest.fn(),
    S3_BUCKET: 'test-bucket',
}));
const s3Config = __importStar(require("../../../config/s3.config"));
describe('MediaService', () => {
    let mediaService;
    let mockMediaRepository;
    const tenantId = 'tenant-123';
    const userId = 'user-456';
    // JPEG magic bytes
    const jpegMagicBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    // PNG magic bytes
    const pngMagicBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    // PDF magic bytes
    const pdfMagicBytes = Buffer.from('%PDF-1.4');
    // MP4 magic bytes (ftyp at offset 4)
    const mp4MagicBytes = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x20]), // Size
        Buffer.from('ftyp'), // Type
        Buffer.from('isom'), // Brand
    ]);
    // Test fixture for media record
    const mockMedia = {
        id: 'media-123',
        tenantId,
        type: media_entity_1.MediaType.IMAGE,
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
        s3Key: `${tenantId}/media/image/uuid-test-image.jpg`,
        s3Bucket: 'test-bucket',
        uploadedBy: userId,
        createdAt: new Date('2024-01-01'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tenant: {},
        uploader: null,
    };
    beforeEach(() => {
        // Create mock repository
        mockMediaRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            delete: jest.fn(),
            findByTenant: jest.fn(),
            countByTenant: jest.fn(),
            findByType: jest.fn(),
        };
        // Reset S3 mocks
        s3Config.uploadToS3.mockResolvedValue(undefined);
        s3Config.deleteFromS3.mockResolvedValue(undefined);
        s3Config.getDownloadSignedUrl.mockResolvedValue('https://signed-url.example.com');
        s3Config.getUploadSignedUrl.mockResolvedValue('https://upload-url.example.com');
        // Create service instance with mocked dependencies
        mediaService = new media_service_1.MediaService(mockMediaRepository);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('uploadMedia', () => {
        const createUploadedFile = (overrides = {}) => ({
            fieldname: 'file',
            originalname: 'test-image.jpg',
            encoding: '7bit',
            mimetype: 'image/jpeg',
            buffer: Buffer.concat([jpegMagicBytes, Buffer.alloc(1000)]),
            size: 1004,
            ...overrides,
        });
        it('should upload JPEG image successfully', async () => {
            const file = createUploadedFile();
            mockMediaRepository.create.mockResolvedValue(mockMedia);
            const result = await mediaService.uploadMedia(file, media_entity_1.MediaType.IMAGE, tenantId, userId);
            expect(s3Config.uploadToS3).toHaveBeenCalled();
            expect(mockMediaRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                tenantId,
                type: media_entity_1.MediaType.IMAGE,
                originalName: 'test-image.jpg',
                mimeType: 'image/jpeg',
                fileSize: 1004,
                uploadedBy: userId,
            }));
            expect(result.id).toBe(mockMedia.id);
            expect(result.downloadUrl).toBe('https://signed-url.example.com');
        });
        it('should upload PNG image successfully', async () => {
            const file = createUploadedFile({
                originalname: 'test-image.png',
                mimetype: 'image/png',
                buffer: Buffer.concat([pngMagicBytes, Buffer.alloc(1000)]),
            });
            mockMediaRepository.create.mockResolvedValue({
                ...mockMedia,
                originalName: 'test-image.png',
                mimeType: 'image/png',
            });
            const result = await mediaService.uploadMedia(file, media_entity_1.MediaType.IMAGE, tenantId, userId);
            expect(s3Config.uploadToS3).toHaveBeenCalled();
            expect(result.id).toBe(mockMedia.id);
        });
        it('should upload PDF document successfully', async () => {
            const file = createUploadedFile({
                originalname: 'document.pdf',
                mimetype: 'application/pdf',
                buffer: Buffer.concat([pdfMagicBytes, Buffer.alloc(1000)]),
            });
            mockMediaRepository.create.mockResolvedValue({
                ...mockMedia,
                type: media_entity_1.MediaType.DOCUMENT,
                originalName: 'document.pdf',
                mimeType: 'application/pdf',
            });
            const result = await mediaService.uploadMedia(file, media_entity_1.MediaType.DOCUMENT, tenantId, userId);
            expect(s3Config.uploadToS3).toHaveBeenCalled();
            expect(result.id).toBe(mockMedia.id);
        });
        it('should upload MP4 video successfully', async () => {
            const file = createUploadedFile({
                originalname: 'video.mp4',
                mimetype: 'video/mp4',
                buffer: Buffer.concat([mp4MagicBytes, Buffer.alloc(1000)]),
            });
            mockMediaRepository.create.mockResolvedValue({
                ...mockMedia,
                type: media_entity_1.MediaType.VIDEO,
                originalName: 'video.mp4',
                mimeType: 'video/mp4',
            });
            const result = await mediaService.uploadMedia(file, media_entity_1.MediaType.VIDEO, tenantId, userId);
            expect(s3Config.uploadToS3).toHaveBeenCalled();
            expect(result.id).toBe(mockMedia.id);
        });
        it('should reject invalid file extension for image type', async () => {
            const file = createUploadedFile({
                originalname: 'document.pdf',
                mimetype: 'image/jpeg',
            });
            await expect(mediaService.uploadMedia(file, media_entity_1.MediaType.IMAGE, tenantId, userId)).rejects.toThrow(http_exceptions_1.BadRequestException);
            await expect(mediaService.uploadMedia(file, media_entity_1.MediaType.IMAGE, tenantId, userId)).rejects.toThrow('Invalid file extension');
            expect(s3Config.uploadToS3).not.toHaveBeenCalled();
        });
        it('should reject invalid MIME type', async () => {
            const file = createUploadedFile({
                mimetype: 'text/plain',
            });
            await expect(mediaService.uploadMedia(file, media_entity_1.MediaType.IMAGE, tenantId, userId)).rejects.toThrow(http_exceptions_1.BadRequestException);
            await expect(mediaService.uploadMedia(file, media_entity_1.MediaType.IMAGE, tenantId, userId)).rejects.toThrow('Invalid file type');
        });
        it('should reject file exceeding size limit for images (5MB)', async () => {
            const file = createUploadedFile({
                size: 6 * 1024 * 1024, // 6MB
            });
            await expect(mediaService.uploadMedia(file, media_entity_1.MediaType.IMAGE, tenantId, userId)).rejects.toThrow(http_exceptions_1.BadRequestException);
            await expect(mediaService.uploadMedia(file, media_entity_1.MediaType.IMAGE, tenantId, userId)).rejects.toThrow('File size exceeds maximum');
        });
        it('should reject file exceeding size limit for videos (16MB)', async () => {
            const file = createUploadedFile({
                originalname: 'video.mp4',
                mimetype: 'video/mp4',
                buffer: Buffer.concat([mp4MagicBytes, Buffer.alloc(100)]),
                size: 20 * 1024 * 1024, // 20MB
            });
            await expect(mediaService.uploadMedia(file, media_entity_1.MediaType.VIDEO, tenantId, userId)).rejects.toThrow(http_exceptions_1.BadRequestException);
            await expect(mediaService.uploadMedia(file, media_entity_1.MediaType.VIDEO, tenantId, userId)).rejects.toThrow('File size exceeds maximum');
        });
        it('should reject file exceeding size limit for documents (100MB)', async () => {
            const file = createUploadedFile({
                originalname: 'document.pdf',
                mimetype: 'application/pdf',
                buffer: Buffer.concat([pdfMagicBytes, Buffer.alloc(100)]),
                size: 110 * 1024 * 1024, // 110MB
            });
            await expect(mediaService.uploadMedia(file, media_entity_1.MediaType.DOCUMENT, tenantId, userId)).rejects.toThrow(http_exceptions_1.BadRequestException);
        });
        it('should reject file with invalid magic bytes (MIME spoofing)', async () => {
            // File claims to be JPEG but has wrong magic bytes
            const file = createUploadedFile({
                buffer: Buffer.from('not a real jpeg file content'),
            });
            await expect(mediaService.uploadMedia(file, media_entity_1.MediaType.IMAGE, tenantId, userId)).rejects.toThrow(http_exceptions_1.BadRequestException);
            await expect(mediaService.uploadMedia(file, media_entity_1.MediaType.IMAGE, tenantId, userId)).rejects.toThrow('File content does not match');
        });
        it('should reject file with too short buffer', async () => {
            const file = createUploadedFile({
                buffer: Buffer.from([0xff, 0xd8]), // Too short
                size: 2,
            });
            await expect(mediaService.uploadMedia(file, media_entity_1.MediaType.IMAGE, tenantId, userId)).rejects.toThrow(http_exceptions_1.BadRequestException);
        });
        it('should cleanup S3 if database insert fails', async () => {
            const file = createUploadedFile();
            mockMediaRepository.create.mockRejectedValue(new Error('Database error'));
            await expect(mediaService.uploadMedia(file, media_entity_1.MediaType.IMAGE, tenantId, userId)).rejects.toThrow(http_exceptions_1.BadRequestException);
            // S3 upload should have been called
            expect(s3Config.uploadToS3).toHaveBeenCalled();
            // S3 cleanup should have been called
            expect(s3Config.deleteFromS3).toHaveBeenCalled();
        });
        it('should throw if S3 upload fails', async () => {
            const file = createUploadedFile();
            s3Config.uploadToS3.mockRejectedValue(new Error('S3 error'));
            await expect(mediaService.uploadMedia(file, media_entity_1.MediaType.IMAGE, tenantId, userId)).rejects.toThrow(http_exceptions_1.BadRequestException);
            await expect(mediaService.uploadMedia(file, media_entity_1.MediaType.IMAGE, tenantId, userId)).rejects.toThrow('Failed to upload file');
            expect(mockMediaRepository.create).not.toHaveBeenCalled();
        });
        it('should sanitize S3 key for path traversal attempts', async () => {
            const file = createUploadedFile({
                originalname: '../../../etc/passwd.jpg',
            });
            mockMediaRepository.create.mockResolvedValue(mockMedia);
            await mediaService.uploadMedia(file, media_entity_1.MediaType.IMAGE, tenantId, userId);
            // Check that the S3 key does not contain path traversal characters
            expect(mockMediaRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                s3Key: expect.not.stringContaining('..'),
            }));
            // The S3 key should contain the tenant path
            expect(mockMediaRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                s3Key: expect.stringContaining('tenant-123/media/image/'),
            }));
        });
        it('should generate tenant-isolated S3 key', async () => {
            const file = createUploadedFile();
            mockMediaRepository.create.mockResolvedValue(mockMedia);
            await mediaService.uploadMedia(file, media_entity_1.MediaType.IMAGE, tenantId, userId);
            expect(mockMediaRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                s3Key: expect.stringContaining(`${tenantId}/media/image/`),
            }));
        });
    });
    describe('getMedia', () => {
        it('should return media with download URL', async () => {
            mockMediaRepository.findById.mockResolvedValue(mockMedia);
            const result = await mediaService.getMedia('media-123', tenantId);
            expect(mockMediaRepository.findById).toHaveBeenCalledWith('media-123', tenantId);
            expect(s3Config.getDownloadSignedUrl).toHaveBeenCalledWith(mockMedia.s3Key);
            expect(result.id).toBe(mockMedia.id);
            expect(result.downloadUrl).toBe('https://signed-url.example.com');
        });
        it('should throw NotFoundException when media not found', async () => {
            mockMediaRepository.findById.mockResolvedValue(null);
            await expect(mediaService.getMedia('nonexistent', tenantId)).rejects.toThrow(http_exceptions_1.NotFoundException);
            await expect(mediaService.getMedia('nonexistent', tenantId)).rejects.toThrow('Media not found');
        });
        it('should respect tenant isolation', async () => {
            mockMediaRepository.findById.mockResolvedValue(null);
            await expect(mediaService.getMedia('media-123', 'different-tenant')).rejects.toThrow(http_exceptions_1.NotFoundException);
            expect(mockMediaRepository.findById).toHaveBeenCalledWith('media-123', 'different-tenant');
        });
    });
    describe('deleteMedia', () => {
        it('should delete media from S3 and database', async () => {
            mockMediaRepository.findById.mockResolvedValue(mockMedia);
            mockMediaRepository.delete.mockResolvedValue(true);
            await mediaService.deleteMedia('media-123', tenantId);
            expect(mockMediaRepository.findById).toHaveBeenCalledWith('media-123', tenantId);
            expect(s3Config.deleteFromS3).toHaveBeenCalledWith(mockMedia.s3Key);
            expect(mockMediaRepository.delete).toHaveBeenCalledWith('media-123', tenantId);
        });
        it('should throw NotFoundException when media not found', async () => {
            mockMediaRepository.findById.mockResolvedValue(null);
            await expect(mediaService.deleteMedia('nonexistent', tenantId)).rejects.toThrow(http_exceptions_1.NotFoundException);
            await expect(mediaService.deleteMedia('nonexistent', tenantId)).rejects.toThrow('Media not found');
            expect(s3Config.deleteFromS3).not.toHaveBeenCalled();
            expect(mockMediaRepository.delete).not.toHaveBeenCalled();
        });
        it('should continue with database deletion even if S3 fails', async () => {
            mockMediaRepository.findById.mockResolvedValue(mockMedia);
            mockMediaRepository.delete.mockResolvedValue(true);
            s3Config.deleteFromS3.mockRejectedValue(new Error('S3 error'));
            // Should not throw
            await mediaService.deleteMedia('media-123', tenantId);
            // Database delete should still be called
            expect(mockMediaRepository.delete).toHaveBeenCalledWith('media-123', tenantId);
        });
    });
    describe('getPresignedUploadUrl', () => {
        it('should return presigned upload URL for valid image', async () => {
            const result = await mediaService.getPresignedUploadUrl(media_entity_1.MediaType.IMAGE, 'test.jpg', tenantId);
            expect(s3Config.getUploadSignedUrl).toHaveBeenCalled();
            expect(result.uploadUrl).toBe('https://upload-url.example.com');
            expect(result.key).toContain(`${tenantId}/media/image/`);
            expect(result.expiresIn).toBe(900); // 15 minutes
        });
        it('should return presigned upload URL for PDF', async () => {
            const result = await mediaService.getPresignedUploadUrl(media_entity_1.MediaType.DOCUMENT, 'document.pdf', tenantId);
            expect(s3Config.getUploadSignedUrl).toHaveBeenCalled();
            expect(result.key).toContain(`${tenantId}/media/document/`);
        });
        it('should return presigned upload URL for video', async () => {
            const result = await mediaService.getPresignedUploadUrl(media_entity_1.MediaType.VIDEO, 'video.mp4', tenantId);
            expect(result.key).toContain(`${tenantId}/media/video/`);
        });
        it('should reject invalid file extension', async () => {
            await expect(mediaService.getPresignedUploadUrl(media_entity_1.MediaType.IMAGE, 'test.exe', tenantId)).rejects.toThrow(http_exceptions_1.BadRequestException);
            await expect(mediaService.getPresignedUploadUrl(media_entity_1.MediaType.IMAGE, 'test.exe', tenantId)).rejects.toThrow('Invalid file extension');
        });
        it('should reject file without extension', async () => {
            await expect(mediaService.getPresignedUploadUrl(media_entity_1.MediaType.IMAGE, 'noextension', tenantId)).rejects.toThrow(http_exceptions_1.BadRequestException);
        });
        it('should reject mismatched extension for document type', async () => {
            await expect(mediaService.getPresignedUploadUrl(media_entity_1.MediaType.DOCUMENT, 'image.jpg', tenantId)).rejects.toThrow(http_exceptions_1.BadRequestException);
        });
        it('should reject mismatched extension for video type', async () => {
            await expect(mediaService.getPresignedUploadUrl(media_entity_1.MediaType.VIDEO, 'image.jpg', tenantId)).rejects.toThrow(http_exceptions_1.BadRequestException);
        });
    });
});
