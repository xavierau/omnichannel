import 'reflect-metadata';
import { WebhookService } from '../webhook.service';
import { ProviderFactory } from '../../messaging/provider-factory';
import { MessageLogRepository } from '../../message-logs/message-log.repository';
import { ChannelAccountRepository } from '../../channel-accounts/channel-account.repository';
import { TemplateRepository } from '../../templates/template.repository';
import { TemplateSseService } from '../../templates/template-sse.service';
import { CredentialService } from '../../messaging/services/credential.service';
import { InboxMessageQueue } from '../../../jobs/inbox-message.queue';
import { WebhookEvent } from '../../messaging/interfaces/messaging-provider.interface';
import { ChannelAccount, ChannelAccountStatus } from '../../channel-accounts/channel-account.entity';

// Mock logger
jest.mock('../../../config/logger.config', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('WebhookService', () => {
  let webhookService: WebhookService;
  let mockProviderFactory: jest.Mocked<ProviderFactory>;
  let mockMessageLogRepo: jest.Mocked<MessageLogRepository>;
  let mockChannelAccountRepo: jest.Mocked<ChannelAccountRepository>;
  let mockTemplateRepo: jest.Mocked<TemplateRepository>;
  let mockTemplateSseService: jest.Mocked<TemplateSseService>;
  let mockCredentialService: jest.Mocked<CredentialService>;
  let mockInboxMessageQueue: jest.Mocked<InboxMessageQueue>;

  const createMockChannelAccount = (overrides: Partial<ChannelAccount> = {}): ChannelAccount =>
    ({
      id: 'channel-account-123',
      tenantId: 'tenant-123',
      channelId: 'whatsapp-channel-1',
      providerId: 'meta-provider-1',
      name: 'Support Line',
      phoneNumber: '+1234567890',
      phoneNumberId: '123456789',
      encryptedCredentials: 'encrypted',
      credentialsIv: 'iv',
      isActive: true,
      isPrimary: true,
      status: ChannelAccountStatus.CONNECTED,
      lastTestedAt: new Date(),
      errorMessage: null,
      webhookUrl: null,
      webhookSecretEncrypted: null,
      webhookSecretIv: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tenant: null as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel: null as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provider: null as any,
      ...overrides,
    }) as ChannelAccount;

  beforeEach(() => {
    jest.clearAllMocks();

    mockProviderFactory = {
      createProviderForWebhook: jest.fn(),
    } as unknown as jest.Mocked<ProviderFactory>;

    mockMessageLogRepo = {
      findByProviderMessageId: jest.fn(),
      updateStatus: jest.fn(),
    } as unknown as jest.Mocked<MessageLogRepository>;

    mockChannelAccountRepo = {
      findByPhoneNumberId: jest.fn(),
      findAllActive: jest.fn(),
      findAllWithWebhookConfig: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ChannelAccountRepository>;

    mockTemplateRepo = {
      findByProviderTemplateId: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<TemplateRepository>;

    mockTemplateSseService = {
      broadcast: jest.fn(),
    } as unknown as jest.Mocked<TemplateSseService>;

    mockCredentialService = {
      decryptCredentials: jest.fn(),
    } as unknown as jest.Mocked<CredentialService>;

    mockInboxMessageQueue = {
      queueInboundProcessing: jest.fn().mockResolvedValue({ id: 'job-123' }),
    } as unknown as jest.Mocked<InboxMessageQueue>;

    webhookService = new WebhookService(
      mockProviderFactory,
      mockMessageLogRepo,
      mockChannelAccountRepo,
      mockTemplateRepo,
      mockTemplateSseService,
      mockCredentialService,
      mockInboxMessageQueue
    );
  });

  describe('processInboundMessage', () => {
    const createMessageReceivedEvent = (
      messageType: string,
      content: Record<string, unknown>,
      phoneNumberId = '123456789'
    ): WebhookEvent => ({
      type: 'message_received',
      providerMessageId: 'wamid.abc123',
      timestamp: new Date('2024-01-15T10:30:00Z'),
      rawEvent: {
        id: 'wamid.abc123',
        from: '85291234567',
        timestamp: '1705314600',
        type: messageType,
        ...content,
        metadata: {
          phone_number_id: phoneNumberId,
          display_phone_number: '+1234567890',
        },
      },
    });

    describe('when phone_number_id is present', () => {
      it('should queue inbound text message for processing', async () => {
        const event = createMessageReceivedEvent('text', {
          text: { body: 'Hello, I need help!' },
        });
        const channelAccount = createMockChannelAccount();

        mockChannelAccountRepo.findByPhoneNumberId.mockResolvedValue(channelAccount);

        // Access private method through processWebhookEvent
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (webhookService as any).processInboundMessage(event);

        expect(mockChannelAccountRepo.findByPhoneNumberId).toHaveBeenCalledWith('123456789');
        expect(mockInboxMessageQueue.queueInboundProcessing).toHaveBeenCalledWith(
          expect.objectContaining({
            tenantId: 'tenant-123',
            channelAccountId: 'channel-account-123',
            providerMessageId: 'wamid.abc123',
            fromNumber: '85291234567',
            messageType: 'text',
            content: { text: 'Hello, I need help!' },
            timestamp: expect.any(Date),
          })
        );
      });

      it('should queue inbound image message for processing', async () => {
        const event = createMessageReceivedEvent('image', {
          image: { id: 'media-123', mime_type: 'image/jpeg', caption: 'Check this' },
        });
        const channelAccount = createMockChannelAccount();

        mockChannelAccountRepo.findByPhoneNumberId.mockResolvedValue(channelAccount);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (webhookService as any).processInboundMessage(event);

        expect(mockInboxMessageQueue.queueInboundProcessing).toHaveBeenCalledWith(
          expect.objectContaining({
            messageType: 'image',
            content: { id: 'media-123', mime_type: 'image/jpeg', caption: 'Check this' },
          })
        );
      });

      it('should queue inbound document message for processing', async () => {
        const event = createMessageReceivedEvent('document', {
          document: { id: 'doc-456', mime_type: 'application/pdf', filename: 'invoice.pdf' },
        });
        const channelAccount = createMockChannelAccount();

        mockChannelAccountRepo.findByPhoneNumberId.mockResolvedValue(channelAccount);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (webhookService as any).processInboundMessage(event);

        expect(mockInboxMessageQueue.queueInboundProcessing).toHaveBeenCalledWith(
          expect.objectContaining({
            messageType: 'document',
            content: { id: 'doc-456', mime_type: 'application/pdf', filename: 'invoice.pdf' },
          })
        );
      });

      it('should queue inbound audio message for processing', async () => {
        const event = createMessageReceivedEvent('audio', {
          audio: { id: 'audio-789', mime_type: 'audio/ogg' },
        });
        const channelAccount = createMockChannelAccount();

        mockChannelAccountRepo.findByPhoneNumberId.mockResolvedValue(channelAccount);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (webhookService as any).processInboundMessage(event);

        expect(mockInboxMessageQueue.queueInboundProcessing).toHaveBeenCalledWith(
          expect.objectContaining({
            messageType: 'audio',
            content: { id: 'audio-789', mime_type: 'audio/ogg' },
          })
        );
      });

      it('should queue inbound video message for processing', async () => {
        const event = createMessageReceivedEvent('video', {
          video: { id: 'video-999', mime_type: 'video/mp4', caption: 'Video message' },
        });
        const channelAccount = createMockChannelAccount();

        mockChannelAccountRepo.findByPhoneNumberId.mockResolvedValue(channelAccount);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (webhookService as any).processInboundMessage(event);

        expect(mockInboxMessageQueue.queueInboundProcessing).toHaveBeenCalledWith(
          expect.objectContaining({
            messageType: 'video',
            content: { id: 'video-999', mime_type: 'video/mp4', caption: 'Video message' },
          })
        );
      });

      it('should include raw event in queued job data', async () => {
        const event = createMessageReceivedEvent('text', {
          text: { body: 'Test message' },
        });
        const channelAccount = createMockChannelAccount();

        mockChannelAccountRepo.findByPhoneNumberId.mockResolvedValue(channelAccount);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (webhookService as any).processInboundMessage(event);

        expect(mockInboxMessageQueue.queueInboundProcessing).toHaveBeenCalledWith(
          expect.objectContaining({
            rawEvent: event.rawEvent,
          })
        );
      });
    });

    describe('when phone_number_id is missing', () => {
      it('should log warning and return without queueing', async () => {
        const event: WebhookEvent = {
          type: 'message_received',
          providerMessageId: 'wamid.abc123',
          timestamp: new Date(),
          rawEvent: {
            id: 'wamid.abc123',
            from: '85291234567',
            type: 'text',
            text: { body: 'Hello' },
            // No metadata with phone_number_id
          },
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (webhookService as any).processInboundMessage(event);

        expect(mockChannelAccountRepo.findByPhoneNumberId).not.toHaveBeenCalled();
        expect(mockInboxMessageQueue.queueInboundProcessing).not.toHaveBeenCalled();
      });
    });

    describe('when channel account not found', () => {
      it('should log warning and return without queueing', async () => {
        const event = createMessageReceivedEvent('text', {
          text: { body: 'Hello' },
        });

        mockChannelAccountRepo.findByPhoneNumberId.mockResolvedValue(null);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (webhookService as any).processInboundMessage(event);

        expect(mockChannelAccountRepo.findByPhoneNumberId).toHaveBeenCalledWith('123456789');
        expect(mockInboxMessageQueue.queueInboundProcessing).not.toHaveBeenCalled();
      });
    });
  });

  describe('extractMessageContent', () => {
    it('should extract text content', () => {
      const rawMessage = {
        type: 'text',
        text: { body: 'Hello World' },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content = (webhookService as any).extractMessageContent(rawMessage);

      expect(content).toEqual({ text: 'Hello World' });
    });

    it('should extract image content', () => {
      const rawMessage = {
        type: 'image',
        image: { id: 'media-123', mime_type: 'image/jpeg', caption: 'Photo' },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content = (webhookService as any).extractMessageContent(rawMessage);

      expect(content).toEqual({ id: 'media-123', mime_type: 'image/jpeg', caption: 'Photo' });
    });

    it('should extract document content', () => {
      const rawMessage = {
        type: 'document',
        document: { id: 'doc-456', mime_type: 'application/pdf', filename: 'report.pdf' },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content = (webhookService as any).extractMessageContent(rawMessage);

      expect(content).toEqual({ id: 'doc-456', mime_type: 'application/pdf', filename: 'report.pdf' });
    });

    it('should extract audio content', () => {
      const rawMessage = {
        type: 'audio',
        audio: { id: 'audio-789', mime_type: 'audio/ogg' },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content = (webhookService as any).extractMessageContent(rawMessage);

      expect(content).toEqual({ id: 'audio-789', mime_type: 'audio/ogg' });
    });

    it('should extract video content', () => {
      const rawMessage = {
        type: 'video',
        video: { id: 'video-111', mime_type: 'video/mp4', caption: 'Video' },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content = (webhookService as any).extractMessageContent(rawMessage);

      expect(content).toEqual({ id: 'video-111', mime_type: 'video/mp4', caption: 'Video' });
    });

    it('should return entire message for unknown type', () => {
      const rawMessage = {
        type: 'sticker',
        sticker: { id: 'sticker-222' },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content = (webhookService as any).extractMessageContent(rawMessage);

      expect(content).toEqual(rawMessage);
    });
  });

  describe('processWebhookEvent with message_received', () => {
    it('should route message_received events to processInboundMessage', async () => {
      const mockProvider = {
        validateWebhookSignature: jest.fn().mockReturnValue(true),
        parseWebhookPayload: jest.fn().mockReturnValue([
          {
            type: 'message_received',
            providerMessageId: 'wamid.abc123',
            timestamp: new Date(),
            rawEvent: {
              id: 'wamid.abc123',
              from: '85291234567',
              type: 'text',
              text: { body: 'Hello' },
              metadata: { phone_number_id: '123456789' },
            },
          },
        ]),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockProviderFactory.createProviderForWebhook.mockReturnValue(mockProvider as any);

      const channelAccount = createMockChannelAccount();
      mockChannelAccountRepo.findByPhoneNumberId.mockResolvedValue(channelAccount);

      // Mock environment variable
      const originalEnv = process.env.META_APP_SECRET;
      process.env.META_APP_SECRET = 'test-secret';

      try {
        const result = await webhookService.processMetaWebhook(
          JSON.stringify({ object: 'whatsapp_business_account', entry: [] }),
          'sha256=valid-signature'
        );

        expect(result.success).toBe(true);
        expect(result.eventsProcessed).toBe(1);
        expect(mockInboxMessageQueue.queueInboundProcessing).toHaveBeenCalled();
      } finally {
        process.env.META_APP_SECRET = originalEnv;
      }
    });
  });

  describe('verifyMetaWebhook', () => {
    it('should return valid result with challenge when token matches global env var', async () => {
      const originalEnv = process.env.META_WEBHOOK_VERIFY_TOKEN;
      process.env.META_WEBHOOK_VERIFY_TOKEN = 'test-verify-token';

      try {
        const result = await webhookService.verifyMetaWebhook({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'test-verify-token',
          'hub.challenge': 'challenge-string-123',
        });

        expect(result.valid).toBe(true);
        expect(result.challenge).toBe('challenge-string-123');
      } finally {
        process.env.META_WEBHOOK_VERIFY_TOKEN = originalEnv;
      }
    });

    it('should return valid result when token matches stored channel token', async () => {
      const channelAccount = createMockChannelAccount({
        webhookSecretEncrypted: 'encrypted-secret',
        webhookSecretIv: 'iv-value',
      });
      mockChannelAccountRepo.findAllWithWebhookConfig = jest.fn().mockResolvedValue([channelAccount]);
      mockCredentialService.decryptCredentials = jest.fn().mockResolvedValue({
        verifyToken: 'channel-specific-token',
      });

      const result = await webhookService.verifyMetaWebhook({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'channel-specific-token',
        'hub.challenge': 'challenge-string-123',
      });

      expect(result.valid).toBe(true);
      expect(result.challenge).toBe('challenge-string-123');
    });

    it('should return invalid result when mode is not subscribe', async () => {
      const result = await webhookService.verifyMetaWebhook({
        'hub.mode': 'unsubscribe',
        'hub.verify_token': 'token',
        'hub.challenge': 'challenge',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid mode');
    });

    it('should return invalid result when token does not match', async () => {
      const originalEnv = process.env.META_WEBHOOK_VERIFY_TOKEN;
      process.env.META_WEBHOOK_VERIFY_TOKEN = 'correct-token';

      try {
        const result = await webhookService.verifyMetaWebhook({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong-token',
          'hub.challenge': 'challenge',
        });

        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid verify token');
      } finally {
        process.env.META_WEBHOOK_VERIFY_TOKEN = originalEnv;
      }
    });
  });
});
