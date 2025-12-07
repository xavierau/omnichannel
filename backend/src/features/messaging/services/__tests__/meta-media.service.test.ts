import 'reflect-metadata';
import { MetaMediaService } from '../meta-media.service';
import { ProviderFactory } from '../../provider-factory';
import { IMessagingProvider } from '../../interfaces/messaging-provider.interface';

// Mock the logger
jest.mock('../../../../config/logger.config', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  auditLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the S3 config
jest.mock('../../../../config/s3.config', () => ({
  uploadToS3: jest.fn(),
  getDownloadSignedUrl: jest.fn(),
  S3_BUCKET: 'test-bucket',
}));

import * as s3Config from '../../../../config/s3.config';
import { logger } from '../../../../config/logger.config';

/**
 * Mock provider interface for testing
 */
interface MockProvider {
  providerCode: string;
  channelCode: string;
  getMediaUrl: jest.Mock;
  downloadMedia: jest.Mock;
}

describe('MetaMediaService', () => {
  let metaMediaService: MetaMediaService;
  let mockProviderFactory: jest.Mocked<ProviderFactory>;
  let mockProvider: MockProvider;

  const tenantId = 'tenant-123';
  const channelAccountId = 'channel-456';
  const conversationId = 'conv-789';
  const mediaId = 'media-abc123';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock provider with media methods
    mockProvider = {
      providerCode: 'meta_cloud_api',
      channelCode: 'whatsapp',
      getMediaUrl: jest.fn(),
      downloadMedia: jest.fn(),
    };

    // Create mock provider factory
    mockProviderFactory = {
      createProviderForChannelAccount: jest.fn().mockResolvedValue(mockProvider),
      createProviderForTenantChannel: jest.fn(),
      createProviderForWebhook: jest.fn(),
      createProviderWithCredentials: jest.fn(),
    } as unknown as jest.Mocked<ProviderFactory>;

    // Create service instance
    metaMediaService = new MetaMediaService(mockProviderFactory);

    // Default S3 mock implementations
    (s3Config.uploadToS3 as jest.Mock).mockResolvedValue(undefined);
    (s3Config.getDownloadSignedUrl as jest.Mock).mockResolvedValue(
      'https://s3.example.com/signed-url'
    );
  });

  describe('processInboundMedia', () => {
    it('should download image from Meta and upload to S3', async () => {
      const mimeType = 'image/jpeg';
      const mediaBuffer = Buffer.from('fake-image-data');
      const metaUrl = 'https://cdn.meta.com/media/123';

      mockProvider.getMediaUrl.mockResolvedValue(metaUrl);
      mockProvider.downloadMedia.mockResolvedValue({
        data: mediaBuffer,
        contentType: mimeType,
      });

      const result = await metaMediaService.processInboundMedia(
        mediaId,
        mimeType,
        channelAccountId,
        tenantId,
        conversationId
      );

      // Verify provider factory was called
      expect(mockProviderFactory.createProviderForChannelAccount).toHaveBeenCalledWith(
        channelAccountId
      );

      // Verify getMediaUrl was called
      expect(mockProvider.getMediaUrl).toHaveBeenCalledWith(mediaId);

      // Verify downloadMedia was called with the URL
      expect(mockProvider.downloadMedia).toHaveBeenCalledWith(metaUrl);

      // Verify S3 upload was called
      expect(s3Config.uploadToS3).toHaveBeenCalledWith(
        expect.stringContaining(`${tenantId}/media/${conversationId}/`),
        mediaBuffer,
        mimeType
      );

      // Verify the S3 key has correct extension
      const uploadCall = (s3Config.uploadToS3 as jest.Mock).mock.calls[0];
      expect(uploadCall[0]).toMatch(/\.jpg$/);

      // Verify signed URL was generated
      expect(s3Config.getDownloadSignedUrl).toHaveBeenCalledWith(
        expect.stringContaining(`${tenantId}/media/${conversationId}/`),
        7 * 24 * 60 * 60 // 7 days in seconds
      );

      // Verify result structure
      expect(result).toEqual({
        s3Key: expect.stringContaining(`${tenantId}/media/${conversationId}/`),
        url: 'https://s3.example.com/signed-url',
        contentType: mimeType,
        size: mediaBuffer.length,
      });
    });

    it('should handle PNG images correctly', async () => {
      const mimeType = 'image/png';
      const mediaBuffer = Buffer.from('fake-png-data');

      mockProvider.getMediaUrl.mockResolvedValue('https://cdn.meta.com/media/png');
      mockProvider.downloadMedia.mockResolvedValue({
        data: mediaBuffer,
        contentType: mimeType,
      });

      const result = await metaMediaService.processInboundMedia(
        mediaId,
        mimeType,
        channelAccountId,
        tenantId,
        conversationId
      );

      // Verify the S3 key has correct extension
      expect(result.s3Key).toMatch(/\.png$/);
      expect(result.contentType).toBe(mimeType);
    });

    it('should handle WebP stickers correctly', async () => {
      const mimeType = 'image/webp';
      const mediaBuffer = Buffer.from('fake-sticker-data');

      mockProvider.getMediaUrl.mockResolvedValue('https://cdn.meta.com/media/sticker');
      mockProvider.downloadMedia.mockResolvedValue({
        data: mediaBuffer,
        contentType: mimeType,
      });

      const result = await metaMediaService.processInboundMedia(
        mediaId,
        mimeType,
        channelAccountId,
        tenantId,
        conversationId
      );

      expect(result.s3Key).toMatch(/\.webp$/);
      expect(result.contentType).toBe(mimeType);
    });

    it('should handle MP4 videos correctly', async () => {
      const mimeType = 'video/mp4';
      const mediaBuffer = Buffer.from('fake-video-data');

      mockProvider.getMediaUrl.mockResolvedValue('https://cdn.meta.com/media/video');
      mockProvider.downloadMedia.mockResolvedValue({
        data: mediaBuffer,
        contentType: mimeType,
      });

      const result = await metaMediaService.processInboundMedia(
        mediaId,
        mimeType,
        channelAccountId,
        tenantId,
        conversationId
      );

      expect(result.s3Key).toMatch(/\.mp4$/);
      expect(result.contentType).toBe(mimeType);
    });

    it('should handle audio files correctly', async () => {
      const mimeType = 'audio/ogg';
      const mediaBuffer = Buffer.from('fake-audio-data');

      mockProvider.getMediaUrl.mockResolvedValue('https://cdn.meta.com/media/audio');
      mockProvider.downloadMedia.mockResolvedValue({
        data: mediaBuffer,
        contentType: mimeType,
      });

      const result = await metaMediaService.processInboundMedia(
        mediaId,
        mimeType,
        channelAccountId,
        tenantId,
        conversationId
      );

      expect(result.s3Key).toMatch(/\.ogg$/);
      expect(result.contentType).toBe(mimeType);
    });

    it('should handle PDF documents correctly', async () => {
      const mimeType = 'application/pdf';
      const mediaBuffer = Buffer.from('fake-pdf-data');

      mockProvider.getMediaUrl.mockResolvedValue('https://cdn.meta.com/media/doc');
      mockProvider.downloadMedia.mockResolvedValue({
        data: mediaBuffer,
        contentType: mimeType,
      });

      const result = await metaMediaService.processInboundMedia(
        mediaId,
        mimeType,
        channelAccountId,
        tenantId,
        conversationId
      );

      expect(result.s3Key).toMatch(/\.pdf$/);
      expect(result.contentType).toBe(mimeType);
    });

    it('should handle DOCX documents correctly', async () => {
      const mimeType =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const mediaBuffer = Buffer.from('fake-docx-data');

      mockProvider.getMediaUrl.mockResolvedValue('https://cdn.meta.com/media/docx');
      mockProvider.downloadMedia.mockResolvedValue({
        data: mediaBuffer,
        contentType: mimeType,
      });

      const result = await metaMediaService.processInboundMedia(
        mediaId,
        mimeType,
        channelAccountId,
        tenantId,
        conversationId
      );

      expect(result.s3Key).toMatch(/\.docx$/);
      expect(result.contentType).toBe(mimeType);
    });

    it('should handle unknown MIME types with no extension', async () => {
      const mimeType = 'application/unknown-type';
      const mediaBuffer = Buffer.from('unknown-data');

      mockProvider.getMediaUrl.mockResolvedValue('https://cdn.meta.com/media/unknown');
      mockProvider.downloadMedia.mockResolvedValue({
        data: mediaBuffer,
        contentType: mimeType,
      });

      const result = await metaMediaService.processInboundMedia(
        mediaId,
        mimeType,
        channelAccountId,
        tenantId,
        conversationId
      );

      // S3 key should not have an extension for unknown types
      // UUID format includes alphanumeric characters
      expect(result.s3Key).toMatch(new RegExp(`${tenantId}/media/${conversationId}/\\d+-[a-zA-Z0-9-]+$`));
      expect(result.contentType).toBe(mimeType);
    });

    it('should use downloaded content type when different from provided MIME type', async () => {
      const providedMimeType = 'application/octet-stream';
      const actualMimeType = 'image/jpeg';
      const mediaBuffer = Buffer.from('fake-image-data');

      mockProvider.getMediaUrl.mockResolvedValue('https://cdn.meta.com/media/123');
      mockProvider.downloadMedia.mockResolvedValue({
        data: mediaBuffer,
        contentType: actualMimeType,
      });

      const result = await metaMediaService.processInboundMedia(
        mediaId,
        providedMimeType,
        channelAccountId,
        tenantId,
        conversationId
      );

      // Should use the actual content type from download
      expect(result.contentType).toBe(actualMimeType);
      expect(result.s3Key).toMatch(/\.jpg$/);

      // S3 upload should use actual content type
      expect(s3Config.uploadToS3).toHaveBeenCalledWith(
        expect.any(String),
        mediaBuffer,
        actualMimeType
      );
    });

    it('should throw error when provider does not support media operations', async () => {
      const providerWithoutMedia = {
        providerCode: 'basic_provider',
        channelCode: 'sms',
        // No getMediaUrl or downloadMedia methods
      };

      mockProviderFactory.createProviderForChannelAccount.mockResolvedValue(
        providerWithoutMedia as IMessagingProvider
      );

      await expect(
        metaMediaService.processInboundMedia(
          mediaId,
          'image/jpeg',
          channelAccountId,
          tenantId,
          conversationId
        )
      ).rejects.toThrow('Provider does not support media operations');
    });

    it('should propagate error when getMediaUrl fails', async () => {
      mockProvider.getMediaUrl.mockRejectedValue(
        new Error('Failed to get media URL: Invalid media ID')
      );

      await expect(
        metaMediaService.processInboundMedia(
          mediaId,
          'image/jpeg',
          channelAccountId,
          tenantId,
          conversationId
        )
      ).rejects.toThrow('Failed to get media URL');

      // Download should not be attempted
      expect(mockProvider.downloadMedia).not.toHaveBeenCalled();
      expect(s3Config.uploadToS3).not.toHaveBeenCalled();
    });

    it('should propagate error when downloadMedia fails', async () => {
      mockProvider.getMediaUrl.mockResolvedValue('https://cdn.meta.com/media/123');
      mockProvider.downloadMedia.mockRejectedValue(
        new Error('Failed to download media: Connection timeout')
      );

      await expect(
        metaMediaService.processInboundMedia(
          mediaId,
          'image/jpeg',
          channelAccountId,
          tenantId,
          conversationId
        )
      ).rejects.toThrow('Failed to download media');

      // S3 upload should not be attempted
      expect(s3Config.uploadToS3).not.toHaveBeenCalled();
    });

    it('should propagate error when S3 upload fails', async () => {
      const mimeType = 'image/jpeg';
      const mediaBuffer = Buffer.from('fake-image-data');

      mockProvider.getMediaUrl.mockResolvedValue('https://cdn.meta.com/media/123');
      mockProvider.downloadMedia.mockResolvedValue({
        data: mediaBuffer,
        contentType: mimeType,
      });
      (s3Config.uploadToS3 as jest.Mock).mockRejectedValue(new Error('S3 upload failed'));

      await expect(
        metaMediaService.processInboundMedia(
          mediaId,
          mimeType,
          channelAccountId,
          tenantId,
          conversationId
        )
      ).rejects.toThrow('S3 upload failed');
    });

    it('should generate unique S3 keys for each upload', async () => {
      const mimeType = 'image/jpeg';
      const mediaBuffer = Buffer.from('fake-image-data');

      mockProvider.getMediaUrl.mockResolvedValue('https://cdn.meta.com/media/123');
      mockProvider.downloadMedia.mockResolvedValue({
        data: mediaBuffer,
        contentType: mimeType,
      });

      const result1 = await metaMediaService.processInboundMedia(
        mediaId,
        mimeType,
        channelAccountId,
        tenantId,
        conversationId
      );

      const result2 = await metaMediaService.processInboundMedia(
        mediaId,
        mimeType,
        channelAccountId,
        tenantId,
        conversationId
      );

      // S3 keys should be unique (contain different UUIDs)
      expect(result1.s3Key).not.toBe(result2.s3Key);
    });

    it('should log debug message when processing media', async () => {
      const mimeType = 'image/jpeg';
      const mediaBuffer = Buffer.from('fake-image-data');

      mockProvider.getMediaUrl.mockResolvedValue('https://cdn.meta.com/media/123');
      mockProvider.downloadMedia.mockResolvedValue({
        data: mediaBuffer,
        contentType: mimeType,
      });

      await metaMediaService.processInboundMedia(
        mediaId,
        mimeType,
        channelAccountId,
        tenantId,
        conversationId
      );

      expect(logger.debug).toHaveBeenCalledWith(
        'Processing inbound media',
        expect.objectContaining({
          mediaId,
          mimeType,
          channelAccountId,
          tenantId,
          conversationId,
        })
      );
    });

    it('should log info message after successful upload', async () => {
      const mimeType = 'image/jpeg';
      const mediaBuffer = Buffer.from('fake-image-data');

      mockProvider.getMediaUrl.mockResolvedValue('https://cdn.meta.com/media/123');
      mockProvider.downloadMedia.mockResolvedValue({
        data: mediaBuffer,
        contentType: mimeType,
      });

      await metaMediaService.processInboundMedia(
        mediaId,
        mimeType,
        channelAccountId,
        tenantId,
        conversationId
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Inbound media processed and uploaded to S3',
        expect.objectContaining({
          mediaId,
          s3Key: expect.any(String),
          contentType: mimeType,
          size: mediaBuffer.length,
          tenantId,
          conversationId,
        })
      );
    });

    it('should handle MIME types with charset parameter', async () => {
      const mimeType = 'text/plain; charset=utf-8';
      const mediaBuffer = Buffer.from('text content');

      mockProvider.getMediaUrl.mockResolvedValue('https://cdn.meta.com/media/123');
      mockProvider.downloadMedia.mockResolvedValue({
        data: mediaBuffer,
        contentType: mimeType,
      });

      const result = await metaMediaService.processInboundMedia(
        mediaId,
        mimeType,
        channelAccountId,
        tenantId,
        conversationId
      );

      // Should normalize MIME type and get correct extension
      expect(result.s3Key).toMatch(/\.txt$/);
    });
  });

  describe('refreshMediaUrl', () => {
    it('should generate new signed URL for existing S3 key', async () => {
      const s3Key = `${tenantId}/media/${conversationId}/1234567890-uuid.jpg`;

      const result = await metaMediaService.refreshMediaUrl(s3Key);

      expect(s3Config.getDownloadSignedUrl).toHaveBeenCalledWith(
        s3Key,
        7 * 24 * 60 * 60 // Default 7 days
      );
      expect(result).toBe('https://s3.example.com/signed-url');
    });

    it('should accept custom expiry time', async () => {
      const s3Key = `${tenantId}/media/${conversationId}/1234567890-uuid.jpg`;
      const customExpiry = 3600; // 1 hour

      await metaMediaService.refreshMediaUrl(s3Key, customExpiry);

      expect(s3Config.getDownloadSignedUrl).toHaveBeenCalledWith(s3Key, customExpiry);
    });
  });
});
