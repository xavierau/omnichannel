import 'reflect-metadata';
import axios from 'axios';
import * as crypto from 'crypto';
import { OutgoingWebhookDispatcher } from '../infrastructure/outgoing-webhook.dispatcher';
import { CredentialService } from '../../messaging/services/credential.service';
import { OutgoingWebhookPayload } from '../interfaces/webhook-payload.interface';

// Mock logger
jest.mock('../../../config/logger.config', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock axios
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    isAxiosError: jest.fn(),
  },
  isAxiosError: jest.fn(),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OutgoingWebhookDispatcher', () => {
  let dispatcher: OutgoingWebhookDispatcher;
  let mockCredentialService: jest.Mocked<CredentialService>;

  const createMockPayload = (overrides: Partial<OutgoingWebhookPayload> = {}): OutgoingWebhookPayload => ({
    event: 'message.received.unassigned',
    timestamp: '2024-01-15T10:30:00.000Z',
    message: {
      id: 'msg-123',
      providerMessageId: 'wamid.abc123',
      contentType: 'text',
      content: { body: 'Hello' },
      receivedAt: '2024-01-15T10:30:00.000Z',
    },
    conversation: {
      id: 'conv-456',
      status: 'unassigned',
      createdAt: '2024-01-15T10:00:00.000Z',
      lastMessageAt: '2024-01-15T10:30:00.000Z',
    },
    customer: {
      id: 'cust-789',
      name: 'John Doe',
      whatsappNumber: '+85291234567',
      customFields: {},
    },
    channelAccount: {
      id: 'ca-001',
      name: 'Support Line',
      phoneNumber: '+1234567890',
    },
    tenantId: 'tenant-123',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockCredentialService = {
      decryptString: jest.fn().mockResolvedValue('webhook-secret-123'),
    } as unknown as jest.Mocked<CredentialService>;

    dispatcher = new OutgoingWebhookDispatcher(mockCredentialService);
  });

  describe('dispatch', () => {
    describe('successful dispatch', () => {
      it('should send webhook with correct headers and payload', async () => {
        const payload = createMockPayload();
        mockedAxios.post.mockResolvedValue({ status: 200 });

        const result = await dispatcher.dispatch(
          'https://example.com/webhook',
          payload,
          'encrypted-secret',
          'iv-value'
        );

        expect(result.success).toBe(true);
        expect(result.statusCode).toBe(200);
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'https://example.com/webhook',
          payload,
          expect.objectContaining({
            timeout: 30000,
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'X-Webhook-Signature': expect.stringMatching(/^sha256=[a-f0-9]{64}$/),
              'X-Webhook-Timestamp': expect.stringMatching(/^\d+$/),
            }),
          })
        );
      });

      it('should decrypt secret using credential service', async () => {
        const payload = createMockPayload();
        mockedAxios.post.mockResolvedValue({ status: 200 });

        await dispatcher.dispatch(
          'https://example.com/webhook',
          payload,
          'my-encrypted-secret',
          'my-iv'
        );

        expect(mockCredentialService.decryptString).toHaveBeenCalledWith(
          'my-encrypted-secret',
          'my-iv'
        );
      });

      it('should generate correct HMAC signature', async () => {
        const payload = createMockPayload();
        const secret = 'test-secret-key';
        mockCredentialService.decryptString.mockResolvedValue(secret);
        mockedAxios.post.mockResolvedValue({ status: 200 });

        await dispatcher.dispatch(
          'https://example.com/webhook',
          payload,
          'encrypted-secret',
          'iv-value'
        );

        // Extract the signature and timestamp from the call
        const callArgs = mockedAxios.post.mock.calls[0];
        const headers = callArgs[2]?.headers as { 'X-Webhook-Signature': string; 'X-Webhook-Timestamp': string };
        const signature = headers['X-Webhook-Signature'];
        const timestamp = headers['X-Webhook-Timestamp'];

        // Verify the signature was generated correctly
        const expectedInput = `${timestamp}.${JSON.stringify(payload)}`;
        const expectedSignature = `sha256=${crypto
          .createHmac('sha256', secret)
          .update(expectedInput)
          .digest('hex')}`;

        expect(signature).toBe(expectedSignature);
      });

      it('should accept 2xx status codes as success', async () => {
        const payload = createMockPayload();

        for (const status of [200, 201, 202, 204]) {
          mockedAxios.post.mockResolvedValue({ status });
          const result = await dispatcher.dispatch(
            'https://example.com/webhook',
            payload,
            'encrypted-secret',
            'iv-value'
          );
          expect(result.success).toBe(true);
          expect(result.statusCode).toBe(status);
        }
      });
    });

    describe('HTTP errors', () => {
      it('should return failure for 4xx errors', async () => {
        const payload = createMockPayload();
        const axiosError = {
          isAxiosError: true,
          response: {
            status: 400,
            data: { message: 'Bad Request' },
          },
          message: 'Request failed with status code 400',
        };
        mockedAxios.post.mockRejectedValue(axiosError);
        (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

        const result = await dispatcher.dispatch(
          'https://example.com/webhook',
          payload,
          'encrypted-secret',
          'iv-value'
        );

        expect(result.success).toBe(false);
        expect(result.statusCode).toBe(400);
        expect(result.error).toContain('HTTP 400');
      });

      it('should return failure for 5xx errors', async () => {
        const payload = createMockPayload();
        const axiosError = {
          isAxiosError: true,
          response: {
            status: 500,
            data: 'Internal Server Error',
          },
          message: 'Request failed with status code 500',
        };
        mockedAxios.post.mockRejectedValue(axiosError);
        (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

        const result = await dispatcher.dispatch(
          'https://example.com/webhook',
          payload,
          'encrypted-secret',
          'iv-value'
        );

        expect(result.success).toBe(false);
        expect(result.statusCode).toBe(500);
        expect(result.error).toContain('HTTP 500');
      });

      it('should extract error message from response body', async () => {
        const payload = createMockPayload();
        const axiosError = {
          isAxiosError: true,
          response: {
            status: 422,
            data: { error: 'Validation failed: missing field' },
          },
          message: 'Request failed',
        };
        mockedAxios.post.mockRejectedValue(axiosError);
        (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

        const result = await dispatcher.dispatch(
          'https://example.com/webhook',
          payload,
          'encrypted-secret',
          'iv-value'
        );

        expect(result.error).toContain('Validation failed: missing field');
      });

      it('should handle error_description field in response', async () => {
        const payload = createMockPayload();
        const axiosError = {
          isAxiosError: true,
          response: {
            status: 401,
            data: { error_description: 'Invalid token' },
          },
          message: 'Request failed',
        };
        mockedAxios.post.mockRejectedValue(axiosError);
        (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

        const result = await dispatcher.dispatch(
          'https://example.com/webhook',
          payload,
          'encrypted-secret',
          'iv-value'
        );

        expect(result.error).toContain('Invalid token');
      });
    });

    describe('network errors', () => {
      it('should handle timeout errors', async () => {
        const payload = createMockPayload();
        const axiosError = {
          isAxiosError: true,
          response: undefined,
          code: 'ECONNABORTED',
          message: 'timeout of 30000ms exceeded',
        };
        mockedAxios.post.mockRejectedValue(axiosError);
        (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

        const result = await dispatcher.dispatch(
          'https://example.com/webhook',
          payload,
          'encrypted-secret',
          'iv-value'
        );

        expect(result.success).toBe(false);
        expect(result.statusCode).toBeUndefined();
        expect(result.error).toContain('Request timeout');
      });

      it('should handle connection refused errors', async () => {
        const payload = createMockPayload();
        const axiosError = {
          isAxiosError: true,
          response: undefined,
          code: 'ECONNREFUSED',
          message: 'connect ECONNREFUSED 127.0.0.1:443',
        };
        mockedAxios.post.mockRejectedValue(axiosError);
        (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

        const result = await dispatcher.dispatch(
          'https://example.com/webhook',
          payload,
          'encrypted-secret',
          'iv-value'
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Network error');
      });

      it('should handle DNS resolution errors', async () => {
        const payload = createMockPayload();
        const axiosError = {
          isAxiosError: true,
          response: undefined,
          code: 'ENOTFOUND',
          message: 'getaddrinfo ENOTFOUND unknown.host',
        };
        mockedAxios.post.mockRejectedValue(axiosError);
        (mockedAxios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);

        const result = await dispatcher.dispatch(
          'https://unknown.host/webhook',
          payload,
          'encrypted-secret',
          'iv-value'
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Network error');
      });
    });

    describe('decryption errors', () => {
      it('should handle decryption failure', async () => {
        const payload = createMockPayload();
        mockCredentialService.decryptString.mockRejectedValue(
          new Error('Decryption failed: invalid auth tag')
        );

        const result = await dispatcher.dispatch(
          'https://example.com/webhook',
          payload,
          'invalid-encrypted-secret',
          'invalid-iv'
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Decryption failed');
        expect(mockedAxios.post).not.toHaveBeenCalled();
      });
    });
  });
});
