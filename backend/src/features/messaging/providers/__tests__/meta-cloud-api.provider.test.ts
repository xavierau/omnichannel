import 'reflect-metadata';
import axios, { AxiosError } from 'axios';
import { MetaCloudApiProvider } from '../meta-cloud-api.provider';
import {
  SendFreeformRequest,
  FreeformContentType,
  LocationContent,
  ContactContent,
  ReactionContent,
  StickerContent,
  InteractiveListContent,
  InteractiveButtonContent,
} from '../../interfaces/messaging-provider.interface';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger
jest.mock('../../../../config/logger.config', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('MetaCloudApiProvider', () => {
  let provider: MetaCloudApiProvider;
  let mockClient: {
    post: jest.Mock;
    get: jest.Mock;
  };

  const validCredentials = {
    phoneNumberId: '123456789',
    whatsappBusinessAccountId: 'waba-123',
    accessToken: 'test-access-token',
    appId: 'app-123',
    appSecret: 'app-secret-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockClient = {
      post: jest.fn(),
      get: jest.fn(),
    };

    mockedAxios.create.mockReturnValue(mockClient as any);

    provider = new MetaCloudApiProvider();
  });

  describe('sendFreeformMessage', () => {
    describe('when provider is not initialized', () => {
      it('should return error response when not initialized', async () => {
        const request: SendFreeformRequest = {
          recipient: '+1234567890',
          contentType: 'text',
          content: { text: 'Hello World' },
        };

        const result = await provider.sendFreeformMessage(request);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('NOT_INITIALIZED');
        expect(result.error?.message).toBe('Provider not initialized. Call initialize() first.');
        expect(result.error?.retryable).toBe(false);
      });
    });

    describe('when provider is initialized', () => {
      beforeEach(async () => {
        await provider.initialize(validCredentials);
      });

      describe('text messages', () => {
        it('should send a text message successfully', async () => {
          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'text',
            content: { text: 'Hello World' },
          };

          const mockResponse = {
            data: {
              messaging_product: 'whatsapp',
              contacts: [{ input: '1234567890', wa_id: '1234567890' }],
              messages: [{ id: 'wamid.abc123' }],
            },
          };

          mockClient.post.mockResolvedValue(mockResponse);

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(true);
          expect(result.providerMessageId).toBe('wamid.abc123');
          expect(result.timestamp).toBeInstanceOf(Date);
          expect(result.rawResponse).toEqual(mockResponse.data);

          expect(mockClient.post).toHaveBeenCalledWith(
            '/123456789/messages',
            expect.objectContaining({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: '1234567890',
              type: 'text',
              text: {
                preview_url: true,
                body: 'Hello World',
              },
            })
          );
        });

        it('should normalize phone number by removing + prefix', async () => {
          const request: SendFreeformRequest = {
            recipient: '+85291234567',
            contentType: 'text',
            content: { text: 'Test message' },
          };

          mockClient.post.mockResolvedValue({
            data: {
              messages: [{ id: 'wamid.xyz789' }],
            },
          });

          await provider.sendFreeformMessage(request);

          expect(mockClient.post).toHaveBeenCalledWith(
            '/123456789/messages',
            expect.objectContaining({
              to: '85291234567',
            })
          );
        });

        it('should normalize phone number by removing special characters', async () => {
          const request: SendFreeformRequest = {
            recipient: '+1 (234) 567-8900',
            contentType: 'text',
            content: { text: 'Test message' },
          };

          mockClient.post.mockResolvedValue({
            data: {
              messages: [{ id: 'wamid.xyz789' }],
            },
          });

          await provider.sendFreeformMessage(request);

          expect(mockClient.post).toHaveBeenCalledWith(
            '/123456789/messages',
            expect.objectContaining({
              to: '12345678900',
            })
          );
        });
      });

      describe('image messages', () => {
        it('should send an image message successfully', async () => {
          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'image',
            content: {
              mediaUrl: 'https://example.com/image.jpg',
              caption: 'Check this out!',
            },
          };

          mockClient.post.mockResolvedValue({
            data: {
              messages: [{ id: 'wamid.img123' }],
            },
          });

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(true);
          expect(result.providerMessageId).toBe('wamid.img123');

          expect(mockClient.post).toHaveBeenCalledWith(
            '/123456789/messages',
            expect.objectContaining({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: '1234567890',
              type: 'image',
              image: {
                link: 'https://example.com/image.jpg',
                caption: 'Check this out!',
              },
            })
          );
        });

        it('should send an image message without caption', async () => {
          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'image',
            content: {
              mediaUrl: 'https://example.com/image.png',
            },
          };

          mockClient.post.mockResolvedValue({
            data: {
              messages: [{ id: 'wamid.img456' }],
            },
          });

          await provider.sendFreeformMessage(request);

          expect(mockClient.post).toHaveBeenCalledWith(
            '/123456789/messages',
            expect.objectContaining({
              type: 'image',
              image: {
                link: 'https://example.com/image.png',
                caption: undefined,
              },
            })
          );
        });
      });

      describe('video messages', () => {
        it('should send a video message successfully', async () => {
          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'video',
            content: {
              mediaUrl: 'https://example.com/video.mp4',
              caption: 'Watch this video!',
            },
          };

          mockClient.post.mockResolvedValue({
            data: {
              messages: [{ id: 'wamid.vid123' }],
            },
          });

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(true);
          expect(mockClient.post).toHaveBeenCalledWith(
            '/123456789/messages',
            expect.objectContaining({
              type: 'video',
              video: {
                link: 'https://example.com/video.mp4',
                caption: 'Watch this video!',
              },
            })
          );
        });
      });

      describe('audio messages', () => {
        it('should send an audio message successfully', async () => {
          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'audio',
            content: {
              mediaUrl: 'https://example.com/audio.mp3',
            },
          };

          mockClient.post.mockResolvedValue({
            data: {
              messages: [{ id: 'wamid.aud123' }],
            },
          });

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(true);
          expect(mockClient.post).toHaveBeenCalledWith(
            '/123456789/messages',
            expect.objectContaining({
              type: 'audio',
              audio: {
                link: 'https://example.com/audio.mp3',
              },
            })
          );
        });
      });

      describe('document messages', () => {
        it('should send a document message with filename and caption', async () => {
          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'document',
            content: {
              mediaUrl: 'https://example.com/report.pdf',
              filename: 'Monthly Report.pdf',
              caption: 'Here is your report',
            },
          };

          mockClient.post.mockResolvedValue({
            data: {
              messages: [{ id: 'wamid.doc123' }],
            },
          });

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(true);
          expect(mockClient.post).toHaveBeenCalledWith(
            '/123456789/messages',
            expect.objectContaining({
              type: 'document',
              document: {
                link: 'https://example.com/report.pdf',
                filename: 'Monthly Report.pdf',
                caption: 'Here is your report',
              },
            })
          );
        });

        it('should use default filename when not provided', async () => {
          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'document',
            content: {
              mediaUrl: 'https://example.com/file.pdf',
            },
          };

          mockClient.post.mockResolvedValue({
            data: {
              messages: [{ id: 'wamid.doc456' }],
            },
          });

          await provider.sendFreeformMessage(request);

          expect(mockClient.post).toHaveBeenCalledWith(
            '/123456789/messages',
            expect.objectContaining({
              type: 'document',
              document: {
                link: 'https://example.com/file.pdf',
                filename: 'document',
                caption: undefined,
              },
            })
          );
        });
      });

      describe('location messages', () => {
        it('should send a location message with all fields', async () => {
          const locationContent: LocationContent = {
            latitude: 37.7749,
            longitude: -122.4194,
            name: 'San Francisco Office',
            address: '123 Market Street, San Francisco, CA 94105',
          };

          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'location',
            content: { location: locationContent },
          };

          mockClient.post.mockResolvedValue({
            data: {
              messages: [{ id: 'wamid.loc123' }],
            },
          });

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(true);
          expect(result.providerMessageId).toBe('wamid.loc123');

          expect(mockClient.post).toHaveBeenCalledWith(
            '/123456789/messages',
            expect.objectContaining({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: '1234567890',
              type: 'location',
              location: {
                latitude: '37.7749',
                longitude: '-122.4194',
                name: 'San Francisco Office',
                address: '123 Market Street, San Francisco, CA 94105',
              },
            })
          );
        });

        it('should send a location message with only required fields', async () => {
          const locationContent: LocationContent = {
            latitude: 40.7128,
            longitude: -74.006,
          };

          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'location',
            content: { location: locationContent },
          };

          mockClient.post.mockResolvedValue({
            data: {
              messages: [{ id: 'wamid.loc456' }],
            },
          });

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(true);

          expect(mockClient.post).toHaveBeenCalledWith(
            '/123456789/messages',
            expect.objectContaining({
              type: 'location',
              location: {
                latitude: '40.7128',
                longitude: '-74.006',
                name: undefined,
                address: undefined,
              },
            })
          );
        });
      });

      describe('contact messages', () => {
        it('should send a contact message with full details', async () => {
          const contactContent: ContactContent = {
            name: {
              formatted_name: 'John Doe',
              first_name: 'John',
              last_name: 'Doe',
            },
            phones: [
              { phone: '+1234567890', type: 'CELL', wa_id: '1234567890' },
              { phone: '+0987654321', type: 'WORK' },
            ],
            emails: [
              { email: 'john@example.com', type: 'WORK' },
            ],
          };

          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'contact',
            content: { contact: contactContent },
          };

          mockClient.post.mockResolvedValue({
            data: {
              messages: [{ id: 'wamid.contact123' }],
            },
          });

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(true);
          expect(result.providerMessageId).toBe('wamid.contact123');

          expect(mockClient.post).toHaveBeenCalledWith(
            '/123456789/messages',
            expect.objectContaining({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: '1234567890',
              type: 'contacts',
              contacts: [
                {
                  name: {
                    formatted_name: 'John Doe',
                    first_name: 'John',
                    last_name: 'Doe',
                  },
                  phones: [
                    { phone: '+1234567890', type: 'CELL', wa_id: '1234567890' },
                    { phone: '+0987654321', type: 'WORK' },
                  ],
                  emails: [
                    { email: 'john@example.com', type: 'WORK' },
                  ],
                },
              ],
            })
          );
        });

        it('should send a contact message with only name', async () => {
          const contactContent: ContactContent = {
            name: {
              formatted_name: 'Jane Smith',
            },
          };

          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'contact',
            content: { contact: contactContent },
          };

          mockClient.post.mockResolvedValue({
            data: {
              messages: [{ id: 'wamid.contact456' }],
            },
          });

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(true);

          expect(mockClient.post).toHaveBeenCalledWith(
            '/123456789/messages',
            expect.objectContaining({
              type: 'contacts',
              contacts: [
                {
                  name: {
                    formatted_name: 'Jane Smith',
                  },
                  phones: undefined,
                  emails: undefined,
                },
              ],
            })
          );
        });
      });

      describe('reaction messages', () => {
        it('should send a reaction message with emoji', async () => {
          const reactionContent: ReactionContent = {
            messageId: 'wamid.original123',
            emoji: '\u{1F44D}', // thumbs up
          };

          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'reaction',
            content: { reaction: reactionContent },
          };

          mockClient.post.mockResolvedValue({
            data: {
              messages: [{ id: 'wamid.reaction123' }],
            },
          });

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(true);
          expect(result.providerMessageId).toBe('wamid.reaction123');

          expect(mockClient.post).toHaveBeenCalledWith(
            '/123456789/messages',
            expect.objectContaining({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: '1234567890',
              type: 'reaction',
              reaction: {
                message_id: 'wamid.original123',
                emoji: '\u{1F44D}',
              },
            })
          );
        });

        it('should send a reaction message to remove reaction (empty emoji)', async () => {
          const reactionContent: ReactionContent = {
            messageId: 'wamid.original456',
            emoji: '',
          };

          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'reaction',
            content: { reaction: reactionContent },
          };

          mockClient.post.mockResolvedValue({
            data: {
              messages: [{ id: 'wamid.reaction456' }],
            },
          });

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(true);

          expect(mockClient.post).toHaveBeenCalledWith(
            '/123456789/messages',
            expect.objectContaining({
              type: 'reaction',
              reaction: {
                message_id: 'wamid.original456',
                emoji: '',
              },
            })
          );
        });
      });

      describe('sticker messages', () => {
        it('should send a sticker message with media ID', async () => {
          const stickerContent: StickerContent = {
            mediaId: '1234567890',
          };

          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'sticker',
            content: { sticker: stickerContent },
          };

          mockClient.post.mockResolvedValue({
            data: {
              messages: [{ id: 'wamid.sticker123' }],
            },
          });

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(true);
          expect(result.providerMessageId).toBe('wamid.sticker123');

          expect(mockClient.post).toHaveBeenCalledWith(
            '/123456789/messages',
            expect.objectContaining({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: '1234567890',
              type: 'sticker',
              sticker: {
                id: '1234567890',
              },
            })
          );
        });

        it('should send a sticker message with media URL', async () => {
          const stickerContent: StickerContent = {
            mediaUrl: 'https://example.com/sticker.webp',
          };

          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'sticker',
            content: { sticker: stickerContent },
          };

          mockClient.post.mockResolvedValue({
            data: {
              messages: [{ id: 'wamid.sticker456' }],
            },
          });

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(true);

          expect(mockClient.post).toHaveBeenCalledWith(
            '/123456789/messages',
            expect.objectContaining({
              type: 'sticker',
              sticker: {
                link: 'https://example.com/sticker.webp',
              },
            })
          );
        });
      });

      describe('interactive list messages', () => {
        it('should send an interactive list message with all fields', async () => {
          const listContent: InteractiveListContent = {
            header: 'Choose an option',
            body: 'Please select from the menu below',
            footer: 'Powered by Our Service',
            buttonText: 'View Options',
            sections: [
              {
                title: 'Products',
                rows: [
                  { id: 'prod_1', title: 'Product A', description: 'Description of A' },
                  { id: 'prod_2', title: 'Product B', description: 'Description of B' },
                ],
              },
              {
                title: 'Services',
                rows: [
                  { id: 'svc_1', title: 'Service X' },
                ],
              },
            ],
          };

          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'interactive_list',
            content: { interactiveList: listContent },
          };

          mockClient.post.mockResolvedValue({
            data: {
              messages: [{ id: 'wamid.list123' }],
            },
          });

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(true);
          expect(result.providerMessageId).toBe('wamid.list123');

          expect(mockClient.post).toHaveBeenCalledWith(
            '/123456789/messages',
            expect.objectContaining({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: '1234567890',
              type: 'interactive',
              interactive: {
                type: 'list',
                header: { type: 'text', text: 'Choose an option' },
                body: { text: 'Please select from the menu below' },
                footer: { text: 'Powered by Our Service' },
                action: {
                  button: 'View Options',
                  sections: [
                    {
                      title: 'Products',
                      rows: [
                        { id: 'prod_1', title: 'Product A', description: 'Description of A' },
                        { id: 'prod_2', title: 'Product B', description: 'Description of B' },
                      ],
                    },
                    {
                      title: 'Services',
                      rows: [
                        { id: 'svc_1', title: 'Service X' },
                      ],
                    },
                  ],
                },
              },
            })
          );
        });

        it('should send an interactive list message without optional fields', async () => {
          const listContent: InteractiveListContent = {
            body: 'Select an option',
            buttonText: 'Menu',
            sections: [
              {
                title: 'Options',
                rows: [
                  { id: 'opt_1', title: 'Option 1' },
                ],
              },
            ],
          };

          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'interactive_list',
            content: { interactiveList: listContent },
          };

          mockClient.post.mockResolvedValue({
            data: {
              messages: [{ id: 'wamid.list456' }],
            },
          });

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(true);

          expect(mockClient.post).toHaveBeenCalledWith(
            '/123456789/messages',
            expect.objectContaining({
              type: 'interactive',
              interactive: {
                type: 'list',
                header: undefined,
                body: { text: 'Select an option' },
                footer: undefined,
                action: {
                  button: 'Menu',
                  sections: [
                    {
                      title: 'Options',
                      rows: [
                        { id: 'opt_1', title: 'Option 1' },
                      ],
                    },
                  ],
                },
              },
            })
          );
        });

        it('should validate max 10 sections constraint', async () => {
          const sections = Array.from({ length: 11 }, (_, i) => ({
            title: `Section ${i + 1}`,
            rows: [{ id: `row_${i}`, title: `Row ${i}` }],
          }));

          const listContent: InteractiveListContent = {
            body: 'Too many sections',
            buttonText: 'View',
            sections,
          };

          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'interactive_list',
            content: { interactiveList: listContent },
          };

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(false);
          expect(result.error?.code).toBe('VALIDATION_ERROR');
          expect(result.error?.message).toContain('sections');
          expect(result.error?.retryable).toBe(false);
        });
      });

      describe('interactive button messages', () => {
        it('should send an interactive button message with all fields', async () => {
          const buttonContent: InteractiveButtonContent = {
            header: 'Confirm Action',
            body: 'Do you want to proceed with this action?',
            footer: 'Reply with your choice',
            buttons: [
              { id: 'btn_yes', title: 'Yes' },
              { id: 'btn_no', title: 'No' },
              { id: 'btn_cancel', title: 'Cancel' },
            ],
          };

          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'interactive_buttons',
            content: { interactiveButtons: buttonContent },
          };

          mockClient.post.mockResolvedValue({
            data: {
              messages: [{ id: 'wamid.btn123' }],
            },
          });

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(true);
          expect(result.providerMessageId).toBe('wamid.btn123');

          expect(mockClient.post).toHaveBeenCalledWith(
            '/123456789/messages',
            expect.objectContaining({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: '1234567890',
              type: 'interactive',
              interactive: {
                type: 'button',
                header: { type: 'text', text: 'Confirm Action' },
                body: { text: 'Do you want to proceed with this action?' },
                footer: { text: 'Reply with your choice' },
                action: {
                  buttons: [
                    { type: 'reply', reply: { id: 'btn_yes', title: 'Yes' } },
                    { type: 'reply', reply: { id: 'btn_no', title: 'No' } },
                    { type: 'reply', reply: { id: 'btn_cancel', title: 'Cancel' } },
                  ],
                },
              },
            })
          );
        });

        it('should send an interactive button message without optional fields', async () => {
          const buttonContent: InteractiveButtonContent = {
            body: 'Quick response needed',
            buttons: [
              { id: 'btn_ok', title: 'OK' },
            ],
          };

          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'interactive_buttons',
            content: { interactiveButtons: buttonContent },
          };

          mockClient.post.mockResolvedValue({
            data: {
              messages: [{ id: 'wamid.btn456' }],
            },
          });

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(true);

          expect(mockClient.post).toHaveBeenCalledWith(
            '/123456789/messages',
            expect.objectContaining({
              type: 'interactive',
              interactive: {
                type: 'button',
                header: undefined,
                body: { text: 'Quick response needed' },
                footer: undefined,
                action: {
                  buttons: [
                    { type: 'reply', reply: { id: 'btn_ok', title: 'OK' } },
                  ],
                },
              },
            })
          );
        });

        it('should validate max 3 buttons constraint', async () => {
          const buttonContent: InteractiveButtonContent = {
            body: 'Too many buttons',
            buttons: [
              { id: 'btn_1', title: 'Button 1' },
              { id: 'btn_2', title: 'Button 2' },
              { id: 'btn_3', title: 'Button 3' },
              { id: 'btn_4', title: 'Button 4' },
            ],
          };

          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'interactive_buttons',
            content: { interactiveButtons: buttonContent },
          };

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(false);
          expect(result.error?.code).toBe('VALIDATION_ERROR');
          expect(result.error?.message).toContain('buttons');
          expect(result.error?.retryable).toBe(false);
        });

        it('should validate button title max 20 characters constraint', async () => {
          const buttonContent: InteractiveButtonContent = {
            body: 'Button title too long',
            buttons: [
              { id: 'btn_1', title: 'This button title is way too long for WhatsApp' },
            ],
          };

          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'interactive_buttons',
            content: { interactiveButtons: buttonContent },
          };

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(false);
          expect(result.error?.code).toBe('VALIDATION_ERROR');
          expect(result.error?.message).toContain('20 characters');
          expect(result.error?.retryable).toBe(false);
        });
      });

      describe('error handling', () => {
        it('should handle rate limit error (code 4) as retryable', async () => {
          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'text',
            content: { text: 'Test' },
          };

          const axiosError = {
            response: {
              status: 429,
              data: {
                error: {
                  message: 'Rate limit exceeded',
                  type: 'OAuthException',
                  code: 4,
                },
              },
            },
            message: 'Rate limit exceeded',
          } as AxiosError;

          mockClient.post.mockRejectedValue(axiosError);

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(false);
          expect(result.error?.code).toBe('4');
          expect(result.error?.message).toBe('Rate limit exceeded');
          expect(result.error?.retryable).toBe(true);
        });

        it('should handle service unavailable error (code 2) as retryable', async () => {
          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'text',
            content: { text: 'Test' },
          };

          const axiosError = {
            response: {
              status: 503,
              data: {
                error: {
                  message: 'Service temporarily unavailable',
                  type: 'OAuthException',
                  code: 2,
                },
              },
            },
            message: 'Service temporarily unavailable',
          } as AxiosError;

          mockClient.post.mockRejectedValue(axiosError);

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(false);
          expect(result.error?.retryable).toBe(true);
        });

        it('should handle invalid recipient error (code 131030) as non-retryable', async () => {
          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'text',
            content: { text: 'Test' },
          };

          const axiosError = {
            response: {
              status: 400,
              data: {
                error: {
                  message: 'Recipient phone number not in whitelist',
                  type: 'OAuthException',
                  code: 131030,
                },
              },
            },
            message: 'Recipient phone number not in whitelist',
          } as AxiosError;

          mockClient.post.mockRejectedValue(axiosError);

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(false);
          expect(result.error?.retryable).toBe(false);
        });

        it('should handle network error gracefully', async () => {
          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'text',
            content: { text: 'Test' },
          };

          const networkError = new Error('Network Error');
          mockClient.post.mockRejectedValue(networkError);

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(false);
          expect(result.error?.code).toBe('UNKNOWN');
          expect(result.error?.message).toBe('Network Error');
          expect(result.error?.retryable).toBe(false);
        });

        it('should handle unknown error without response data', async () => {
          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'text',
            content: { text: 'Test' },
          };

          const axiosError = {
            response: {
              status: 500,
              data: null,
            },
            message: 'Internal Server Error',
          } as AxiosError;

          mockClient.post.mockRejectedValue(axiosError);

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(false);
          expect(result.error?.code).toBe('UNKNOWN');
        });
      });

      describe('unsupported content type', () => {
        it('should throw error for unsupported content type', async () => {
          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'unknown_type' as FreeformContentType, // Invalid type
            content: { text: 'test' },
          };

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(false);
          expect(result.error?.code).toBe('UNSUPPORTED_CONTENT_TYPE');
          expect(result.error?.message).toContain('unknown_type');
          expect(result.error?.retryable).toBe(false);
        });
      });

      describe('messageId correlation', () => {
        it('should pass messageId for correlation in logs', async () => {
          const request: SendFreeformRequest = {
            recipient: '+1234567890',
            contentType: 'text',
            content: { text: 'Hello' },
            messageId: 'msg-correlation-123',
          };

          mockClient.post.mockResolvedValue({
            data: {
              messages: [{ id: 'wamid.abc123' }],
            },
          });

          const result = await provider.sendFreeformMessage(request);

          expect(result.success).toBe(true);
          // The messageId is for correlation/logging purposes, not sent to Meta API
        });
      });
    });
  });

  describe('getMediaUrl', () => {
    describe('when provider is not initialized', () => {
      it('should throw error when not initialized', async () => {
        await expect(provider.getMediaUrl('media-123')).rejects.toThrow(
          'Provider not initialized. Call initialize() first.'
        );
      });
    });

    describe('when provider is initialized', () => {
      beforeEach(async () => {
        await provider.initialize(validCredentials);
      });

      it('should return media URL successfully', async () => {
        const mediaId = 'media-123';
        const mockResponse = {
          data: {
            url: 'https://cdn.meta.com/media/abc123',
            mime_type: 'image/jpeg',
            sha256: 'hash123',
            file_size: 12345,
          },
        };

        mockClient.get.mockResolvedValue(mockResponse);

        const result = await provider.getMediaUrl(mediaId);

        expect(result).toBe('https://cdn.meta.com/media/abc123');
        expect(mockClient.get).toHaveBeenCalledWith('/media-123');
      });

      it('should throw error when API call fails', async () => {
        const mediaId = 'invalid-media';
        const axiosError = {
          response: {
            status: 400,
            data: {
              error: {
                message: 'Media not found',
                type: 'OAuthException',
                code: 100,
              },
            },
          },
          message: 'Request failed with status code 400',
        } as AxiosError;

        mockClient.get.mockRejectedValue(axiosError);

        await expect(provider.getMediaUrl(mediaId)).rejects.toThrow(
          'Failed to get media URL: Media not found'
        );
      });

      it('should handle network errors gracefully', async () => {
        const mediaId = 'media-123';
        const networkError = new Error('Network Error');
        mockClient.get.mockRejectedValue(networkError);

        await expect(provider.getMediaUrl(mediaId)).rejects.toThrow(
          'Failed to get media URL: Network Error'
        );
      });
    });
  });

  describe('downloadMedia', () => {
    describe('when provider is not initialized', () => {
      it('should throw error when not initialized', async () => {
        await expect(
          provider.downloadMedia('https://cdn.meta.com/media/123')
        ).rejects.toThrow('Provider not initialized. Call initialize() first.');
      });
    });

    describe('when provider is initialized', () => {
      beforeEach(async () => {
        await provider.initialize(validCredentials);
      });

      it('should download media successfully', async () => {
        const mediaUrl = 'https://cdn.meta.com/media/123';
        const mediaBuffer = Buffer.from('fake-image-data');

        mockedAxios.get.mockResolvedValue({
          data: mediaBuffer,
          headers: {
            'content-type': 'image/jpeg',
          },
          status: 200,
          statusText: 'OK',
          config: {} as any,
        });

        const result = await provider.downloadMedia(mediaUrl);

        expect(result.data).toEqual(mediaBuffer);
        expect(result.contentType).toBe('image/jpeg');

        // Verify Authorization header was sent
        expect(mockedAxios.get).toHaveBeenCalledWith(
          mediaUrl,
          expect.objectContaining({
            headers: {
              Authorization: `Bearer ${validCredentials.accessToken}`,
            },
            responseType: 'arraybuffer',
          })
        );
      });

      it('should use default content type when not provided in response', async () => {
        const mediaUrl = 'https://cdn.meta.com/media/456';
        const mediaBuffer = Buffer.from('unknown-data');

        mockedAxios.get.mockResolvedValue({
          data: mediaBuffer,
          headers: {},
          status: 200,
          statusText: 'OK',
          config: {} as any,
        });

        const result = await provider.downloadMedia(mediaUrl);

        expect(result.data).toEqual(mediaBuffer);
        expect(result.contentType).toBe('application/octet-stream');
      });

      it('should throw error when download fails', async () => {
        const mediaUrl = 'https://cdn.meta.com/media/expired';
        const axiosError = {
          message: 'Request failed with status code 410',
          response: {
            status: 410,
          },
        } as AxiosError;

        mockedAxios.get.mockRejectedValue(axiosError);

        await expect(provider.downloadMedia(mediaUrl)).rejects.toThrow(
          'Failed to download media: Request failed with status code 410'
        );
      });

      it('should handle timeout errors', async () => {
        const mediaUrl = 'https://cdn.meta.com/media/slow';
        const timeoutError = new Error('timeout of 60000ms exceeded');
        mockedAxios.get.mockRejectedValue(timeoutError);

        await expect(provider.downloadMedia(mediaUrl)).rejects.toThrow(
          'Failed to download media: timeout of 60000ms exceeded'
        );
      });

      it('should handle various content types', async () => {
        const testCases = [
          { contentType: 'video/mp4', data: Buffer.from('video') },
          { contentType: 'audio/ogg', data: Buffer.from('audio') },
          { contentType: 'application/pdf', data: Buffer.from('pdf') },
          { contentType: 'image/webp', data: Buffer.from('sticker') },
        ];

        for (const testCase of testCases) {
          mockedAxios.get.mockResolvedValue({
            data: testCase.data,
            headers: { 'content-type': testCase.contentType },
            status: 200,
            statusText: 'OK',
            config: {} as any,
          });

          const result = await provider.downloadMedia('https://cdn.meta.com/media/test');

          expect(result.contentType).toBe(testCase.contentType);
          expect(result.data).toEqual(testCase.data);
        }
      });
    });
  });
});
