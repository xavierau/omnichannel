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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const axios_1 = __importDefault(require("axios"));
const crypto = __importStar(require("crypto"));
const outgoing_webhook_dispatcher_1 = require("../infrastructure/outgoing-webhook.dispatcher");
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
const mockedAxios = axios_1.default;
describe('OutgoingWebhookDispatcher', () => {
    let dispatcher;
    let mockCredentialService;
    const createMockPayload = (overrides = {}) => ({
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
        };
        dispatcher = new outgoing_webhook_dispatcher_1.OutgoingWebhookDispatcher(mockCredentialService);
    });
    describe('dispatch', () => {
        describe('successful dispatch', () => {
            it('should send webhook with correct headers and payload', async () => {
                const payload = createMockPayload();
                mockedAxios.post.mockResolvedValue({ status: 200 });
                const result = await dispatcher.dispatch('https://example.com/webhook', payload, 'encrypted-secret', 'iv-value');
                expect(result.success).toBe(true);
                expect(result.statusCode).toBe(200);
                expect(mockedAxios.post).toHaveBeenCalledWith('https://example.com/webhook', payload, expect.objectContaining({
                    timeout: 30000,
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'X-Webhook-Signature': expect.stringMatching(/^sha256=[a-f0-9]{64}$/),
                        'X-Webhook-Timestamp': expect.stringMatching(/^\d+$/),
                    }),
                }));
            });
            it('should decrypt secret using credential service', async () => {
                const payload = createMockPayload();
                mockedAxios.post.mockResolvedValue({ status: 200 });
                await dispatcher.dispatch('https://example.com/webhook', payload, 'my-encrypted-secret', 'my-iv');
                expect(mockCredentialService.decryptString).toHaveBeenCalledWith('my-encrypted-secret', 'my-iv');
            });
            it('should generate correct HMAC signature', async () => {
                const payload = createMockPayload();
                const secret = 'test-secret-key';
                mockCredentialService.decryptString.mockResolvedValue(secret);
                mockedAxios.post.mockResolvedValue({ status: 200 });
                await dispatcher.dispatch('https://example.com/webhook', payload, 'encrypted-secret', 'iv-value');
                // Extract the signature and timestamp from the call
                const callArgs = mockedAxios.post.mock.calls[0];
                const headers = callArgs[2]?.headers;
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
                    const result = await dispatcher.dispatch('https://example.com/webhook', payload, 'encrypted-secret', 'iv-value');
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
                mockedAxios.isAxiosError.mockReturnValue(true);
                const result = await dispatcher.dispatch('https://example.com/webhook', payload, 'encrypted-secret', 'iv-value');
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
                mockedAxios.isAxiosError.mockReturnValue(true);
                const result = await dispatcher.dispatch('https://example.com/webhook', payload, 'encrypted-secret', 'iv-value');
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
                mockedAxios.isAxiosError.mockReturnValue(true);
                const result = await dispatcher.dispatch('https://example.com/webhook', payload, 'encrypted-secret', 'iv-value');
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
                mockedAxios.isAxiosError.mockReturnValue(true);
                const result = await dispatcher.dispatch('https://example.com/webhook', payload, 'encrypted-secret', 'iv-value');
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
                mockedAxios.isAxiosError.mockReturnValue(true);
                const result = await dispatcher.dispatch('https://example.com/webhook', payload, 'encrypted-secret', 'iv-value');
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
                mockedAxios.isAxiosError.mockReturnValue(true);
                const result = await dispatcher.dispatch('https://example.com/webhook', payload, 'encrypted-secret', 'iv-value');
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
                mockedAxios.isAxiosError.mockReturnValue(true);
                const result = await dispatcher.dispatch('https://unknown.host/webhook', payload, 'encrypted-secret', 'iv-value');
                expect(result.success).toBe(false);
                expect(result.error).toContain('Network error');
            });
        });
        describe('decryption errors', () => {
            it('should handle decryption failure', async () => {
                const payload = createMockPayload();
                mockCredentialService.decryptString.mockRejectedValue(new Error('Decryption failed: invalid auth tag'));
                const result = await dispatcher.dispatch('https://example.com/webhook', payload, 'invalid-encrypted-secret', 'invalid-iv');
                expect(result.success).toBe(false);
                expect(result.error).toContain('Decryption failed');
                expect(mockedAxios.post).not.toHaveBeenCalled();
            });
        });
    });
});
