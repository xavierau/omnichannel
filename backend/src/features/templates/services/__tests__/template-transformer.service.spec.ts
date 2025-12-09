import 'reflect-metadata';
import {
  TemplateTransformerService,
  MetaTemplateRequest,
  MetaComponent,
} from '../template-transformer.service';
import { WhatsAppTemplateGroup } from '../../template-group.entity';
import { TemplateTranslation, TemplateButton } from '../../template-translation.entity';
import { TemplateCategory, HeaderType, ButtonType, TemplateStatus, TemplateQuality } from '../../enums';

describe('TemplateTransformerService', () => {
  let service: TemplateTransformerService;

  beforeEach(() => {
    service = new TemplateTransformerService();
  });

  /**
   * Creates a minimal template group for testing.
   */
  const createTemplateGroup = (overrides: Partial<WhatsAppTemplateGroup> = {}): WhatsAppTemplateGroup => {
    return {
      id: 'group-123',
      tenantId: 'tenant-456',
      channelAccountId: 'channel-789',
      name: 'order_confirmation',
      category: TemplateCategory.MARKETING,
      customFields: {},
      translations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      tenant: null as any,
      channelAccount: null as any,
      ...overrides,
    };
  };

  /**
   * Creates a minimal template translation for testing.
   */
  const createTranslation = (overrides: Partial<TemplateTranslation> = {}): TemplateTranslation => {
    return {
      id: 'translation-123',
      templateGroupId: 'group-123',
      language: 'en',
      status: TemplateStatus.PENDING,
      quality: null,
      headerType: null,
      headerContent: null,
      body: 'Hello, this is a test message.',
      footer: null,
      buttons: [],
      rejectionReason: null,
      metaTemplateId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      templateGroup: null as any,
      ...overrides,
    };
  };

  /**
   * Helper to find a component by type.
   */
  const findComponent = (
    components: MetaComponent[],
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS'
  ): MetaComponent | undefined => {
    return components.find((c: MetaComponent) => c.type === type);
  };

  describe('transformToMetaFormat', () => {
    describe('basic structure', () => {
      it('should return correct name from template group', () => {
        const group = createTemplateGroup({ name: 'welcome_message' });
        const translation = createTranslation();

        const result = service.transformToMetaFormat(group, translation);

        expect(result.name).toBe('welcome_message');
      });

      it('should return correct language from translation', () => {
        const group = createTemplateGroup();
        const translation = createTranslation({ language: 'pt_BR' });

        const result = service.transformToMetaFormat(group, translation);

        expect(result.language).toBe('pt_BR');
      });
    });

    describe('category mapping', () => {
      it('should map marketing category to MARKETING', () => {
        const group = createTemplateGroup({ category: TemplateCategory.MARKETING });
        const translation = createTranslation();

        const result = service.transformToMetaFormat(group, translation);

        expect(result.category).toBe('MARKETING');
      });

      it('should map utility category to UTILITY', () => {
        const group = createTemplateGroup({ category: TemplateCategory.UTILITY });
        const translation = createTranslation();

        const result = service.transformToMetaFormat(group, translation);

        expect(result.category).toBe('UTILITY');
      });

      it('should map authentication category to AUTHENTICATION', () => {
        const group = createTemplateGroup({ category: TemplateCategory.AUTHENTICATION });
        const translation = createTranslation();

        const result = service.transformToMetaFormat(group, translation);

        expect(result.category).toBe('AUTHENTICATION');
      });
    });

    describe('body component', () => {
      it('should always include body component', () => {
        const group = createTemplateGroup();
        const translation = createTranslation({ body: 'Simple body text' });

        const result = service.transformToMetaFormat(group, translation);

        const bodyComponent = findComponent(result.components, 'BODY');
        expect(bodyComponent).toBeDefined();
        expect(bodyComponent?.text).toBe('Simple body text');
      });

      it('should include example for body with variables', () => {
        const group = createTemplateGroup();
        const translation = createTranslation({
          body: 'Hello {{1}}, your order {{2}} is ready.',
        });

        const result = service.transformToMetaFormat(group, translation);

        const bodyComponent = findComponent(result.components, 'BODY');
        expect(bodyComponent?.example).toBeDefined();
        expect(bodyComponent?.example?.body_text).toEqual([['Sample1', 'Sample2']]);
      });

      it('should handle body with single variable', () => {
        const group = createTemplateGroup();
        const translation = createTranslation({
          body: 'Hello {{1}}!',
        });

        const result = service.transformToMetaFormat(group, translation);

        const bodyComponent = findComponent(result.components, 'BODY');
        expect(bodyComponent?.example?.body_text).toEqual([['Sample1']]);
      });

      it('should not include example for body without variables', () => {
        const group = createTemplateGroup();
        const translation = createTranslation({
          body: 'Simple message without variables',
        });

        const result = service.transformToMetaFormat(group, translation);

        const bodyComponent = findComponent(result.components, 'BODY');
        expect(bodyComponent?.example).toBeUndefined();
      });
    });

    describe('header component', () => {
      it('should not include header when headerType is NONE', () => {
        const group = createTemplateGroup();
        const translation = createTranslation({ headerType: HeaderType.NONE });

        const result = service.transformToMetaFormat(group, translation);

        const headerComponent = findComponent(result.components, 'HEADER');
        expect(headerComponent).toBeUndefined();
      });

      it('should not include header when headerType is null', () => {
        const group = createTemplateGroup();
        const translation = createTranslation({ headerType: null });

        const result = service.transformToMetaFormat(group, translation);

        const headerComponent = findComponent(result.components, 'HEADER');
        expect(headerComponent).toBeUndefined();
      });

      it('should include TEXT header with text content', () => {
        const group = createTemplateGroup();
        const translation = createTranslation({
          headerType: HeaderType.TEXT,
          headerContent: 'Welcome to our store!',
        });

        const result = service.transformToMetaFormat(group, translation);

        const headerComponent = findComponent(result.components, 'HEADER');
        expect(headerComponent).toBeDefined();
        expect(headerComponent?.format).toBe('TEXT');
        expect(headerComponent?.text).toBe('Welcome to our store!');
      });

      it('should include example for TEXT header with variables', () => {
        const group = createTemplateGroup();
        const translation = createTranslation({
          headerType: HeaderType.TEXT,
          headerContent: 'Order {{1}} Update',
        });

        const result = service.transformToMetaFormat(group, translation);

        const headerComponent = findComponent(result.components, 'HEADER');
        expect(headerComponent?.example).toBeDefined();
        expect(headerComponent?.example?.header_text).toEqual(['Sample1']);
      });

      it('should include IMAGE header with header_handle', () => {
        const group = createTemplateGroup();
        const translation = createTranslation({
          headerType: HeaderType.IMAGE,
          headerContent: 'https://example.com/image.jpg',
        });

        const result = service.transformToMetaFormat(group, translation);

        const headerComponent = findComponent(result.components, 'HEADER');
        expect(headerComponent).toBeDefined();
        expect(headerComponent?.format).toBe('IMAGE');
        expect(headerComponent?.example?.header_handle).toEqual(['https://example.com/image.jpg']);
      });

      it('should include VIDEO header with header_handle', () => {
        const group = createTemplateGroup();
        const translation = createTranslation({
          headerType: HeaderType.VIDEO,
          headerContent: 'https://example.com/video.mp4',
        });

        const result = service.transformToMetaFormat(group, translation);

        const headerComponent = findComponent(result.components, 'HEADER');
        expect(headerComponent).toBeDefined();
        expect(headerComponent?.format).toBe('VIDEO');
        expect(headerComponent?.example?.header_handle).toEqual(['https://example.com/video.mp4']);
      });

      it('should include DOCUMENT header with header_handle', () => {
        const group = createTemplateGroup();
        const translation = createTranslation({
          headerType: HeaderType.DOCUMENT,
          headerContent: 'https://example.com/document.pdf',
        });

        const result = service.transformToMetaFormat(group, translation);

        const headerComponent = findComponent(result.components, 'HEADER');
        expect(headerComponent).toBeDefined();
        expect(headerComponent?.format).toBe('DOCUMENT');
        expect(headerComponent?.example?.header_handle).toEqual(['https://example.com/document.pdf']);
      });
    });

    describe('footer component', () => {
      it('should not include footer when footer is null', () => {
        const group = createTemplateGroup();
        const translation = createTranslation({ footer: null });

        const result = service.transformToMetaFormat(group, translation);

        const footerComponent = findComponent(result.components, 'FOOTER');
        expect(footerComponent).toBeUndefined();
      });

      it('should not include footer when footer is empty string', () => {
        const group = createTemplateGroup();
        const translation = createTranslation({ footer: '' });

        const result = service.transformToMetaFormat(group, translation);

        const footerComponent = findComponent(result.components, 'FOOTER');
        expect(footerComponent).toBeUndefined();
      });

      it('should include footer when present', () => {
        const group = createTemplateGroup();
        const translation = createTranslation({
          footer: 'Reply STOP to unsubscribe',
        });

        const result = service.transformToMetaFormat(group, translation);

        const footerComponent = findComponent(result.components, 'FOOTER');
        expect(footerComponent).toBeDefined();
        expect(footerComponent?.text).toBe('Reply STOP to unsubscribe');
      });
    });

    describe('buttons component', () => {
      it('should not include buttons when array is empty', () => {
        const group = createTemplateGroup();
        const translation = createTranslation({ buttons: [] });

        const result = service.transformToMetaFormat(group, translation);

        const buttonsComponent = findComponent(result.components, 'BUTTONS');
        expect(buttonsComponent).toBeUndefined();
      });

      it('should map quick_reply button to QUICK_REPLY', () => {
        const group = createTemplateGroup();
        const buttons: TemplateButton[] = [
          { id: 'btn-1', type: ButtonType.QUICK_REPLY, text: 'Yes' },
        ];
        const translation = createTranslation({ buttons });

        const result = service.transformToMetaFormat(group, translation);

        const buttonsComponent = findComponent(result.components, 'BUTTONS');
        expect(buttonsComponent).toBeDefined();
        expect(buttonsComponent?.buttons).toHaveLength(1);
        expect(buttonsComponent?.buttons?.[0]).toEqual({
          type: 'QUICK_REPLY',
          text: 'Yes',
        });
      });

      it('should map url button to URL with url field', () => {
        const group = createTemplateGroup();
        const buttons: TemplateButton[] = [
          {
            id: 'btn-1',
            type: ButtonType.URL,
            text: 'Visit Website',
            url: 'https://example.com/{{1}}',
          },
        ];
        const translation = createTranslation({ buttons });

        const result = service.transformToMetaFormat(group, translation);

        const buttonsComponent = findComponent(result.components, 'BUTTONS');
        expect(buttonsComponent?.buttons?.[0]).toEqual({
          type: 'URL',
          text: 'Visit Website',
          url: 'https://example.com/{{1}}',
        });
      });

      it('should map call button to PHONE_NUMBER with phone_number field', () => {
        const group = createTemplateGroup();
        const buttons: TemplateButton[] = [
          {
            id: 'btn-1',
            type: ButtonType.CALL,
            text: 'Call Us',
            phoneNumber: '+15551234567',
          },
        ];
        const translation = createTranslation({ buttons });

        const result = service.transformToMetaFormat(group, translation);

        const buttonsComponent = findComponent(result.components, 'BUTTONS');
        expect(buttonsComponent?.buttons?.[0]).toEqual({
          type: 'PHONE_NUMBER',
          text: 'Call Us',
          phone_number: '+15551234567',
        });
      });

      it('should map copy_code button to COPY_CODE', () => {
        const group = createTemplateGroup();
        const buttons: TemplateButton[] = [
          { id: 'btn-1', type: ButtonType.COPY_CODE, text: 'Copy Code' },
        ];
        const translation = createTranslation({ buttons });

        const result = service.transformToMetaFormat(group, translation);

        const buttonsComponent = findComponent(result.components, 'BUTTONS');
        expect(buttonsComponent?.buttons?.[0]).toEqual({
          type: 'COPY_CODE',
          text: 'Copy Code',
        });
      });

      it('should map multiple buttons correctly', () => {
        const group = createTemplateGroup();
        const buttons: TemplateButton[] = [
          { id: 'btn-1', type: ButtonType.QUICK_REPLY, text: 'Yes' },
          { id: 'btn-2', type: ButtonType.QUICK_REPLY, text: 'No' },
          { id: 'btn-3', type: ButtonType.URL, text: 'Learn More', url: 'https://example.com' },
        ];
        const translation = createTranslation({ buttons });

        const result = service.transformToMetaFormat(group, translation);

        const buttonsComponent = findComponent(result.components, 'BUTTONS');
        expect(buttonsComponent?.buttons).toHaveLength(3);
      });
    });

    describe('component order', () => {
      it('should order components as HEADER, BODY, FOOTER, BUTTONS', () => {
        const group = createTemplateGroup();
        const translation = createTranslation({
          headerType: HeaderType.TEXT,
          headerContent: 'Header Text',
          body: 'Body text',
          footer: 'Footer text',
          buttons: [{ id: 'btn-1', type: ButtonType.QUICK_REPLY, text: 'OK' }],
        });

        const result = service.transformToMetaFormat(group, translation);

        const componentTypes = result.components.map((c: MetaComponent) => c.type);
        expect(componentTypes).toEqual(['HEADER', 'BODY', 'FOOTER', 'BUTTONS']);
      });
    });

    describe('complex scenarios', () => {
      it('should handle template with all components and variables', () => {
        const group = createTemplateGroup({
          name: 'order_update',
          category: TemplateCategory.UTILITY,
        });
        const translation = createTranslation({
          language: 'en_US',
          headerType: HeaderType.TEXT,
          headerContent: 'Order {{1}} Status',
          body: 'Hi {{1}}, your order {{2}} has been {{3}}.',
          footer: 'Track your order at our website',
          buttons: [
            { id: 'btn-1', type: ButtonType.URL, text: 'Track Order', url: 'https://track.example.com/{{1}}' },
            { id: 'btn-2', type: ButtonType.QUICK_REPLY, text: 'Contact Support' },
          ],
        });

        const result = service.transformToMetaFormat(group, translation);

        expect(result.name).toBe('order_update');
        expect(result.language).toBe('en_US');
        expect(result.category).toBe('UTILITY');
        expect(result.components).toHaveLength(4);

        const header = findComponent(result.components, 'HEADER');
        expect(header?.format).toBe('TEXT');
        expect(header?.text).toBe('Order {{1}} Status');
        expect(header?.example?.header_text).toEqual(['Sample1']);

        const body = findComponent(result.components, 'BODY');
        expect(body?.text).toBe('Hi {{1}}, your order {{2}} has been {{3}}.');
        expect(body?.example?.body_text).toEqual([['Sample1', 'Sample2', 'Sample3']]);

        const footer = findComponent(result.components, 'FOOTER');
        expect(footer?.text).toBe('Track your order at our website');

        const buttons = findComponent(result.components, 'BUTTONS');
        expect(buttons?.buttons).toHaveLength(2);
      });

      it('should handle authentication template with OTP', () => {
        const group = createTemplateGroup({
          name: 'otp_verification',
          category: TemplateCategory.AUTHENTICATION,
        });
        const translation = createTranslation({
          language: 'en',
          headerType: HeaderType.NONE,
          body: 'Your verification code is {{1}}. It expires in 10 minutes.',
          footer: null,
          buttons: [{ id: 'btn-1', type: ButtonType.COPY_CODE, text: 'Copy Code' }],
        });

        const result = service.transformToMetaFormat(group, translation);

        expect(result.category).toBe('AUTHENTICATION');
        expect(result.components).toHaveLength(2);

        const headerComponent = findComponent(result.components, 'HEADER');
        expect(headerComponent).toBeUndefined();

        const body = findComponent(result.components, 'BODY');
        expect(body?.example?.body_text).toEqual([['Sample1']]);

        const buttons = findComponent(result.components, 'BUTTONS');
        expect(buttons?.buttons?.[0].type).toBe('COPY_CODE');
      });

      it('should handle marketing template with image header', () => {
        const group = createTemplateGroup({
          name: 'summer_sale',
          category: TemplateCategory.MARKETING,
        });
        const translation = createTranslation({
          language: 'en',
          headerType: HeaderType.IMAGE,
          headerContent: 'https://cdn.example.com/summer-sale-banner.jpg',
          body: 'Get {{1}}% off on all items! Use code {{2}} at checkout.',
          footer: 'Offer valid until end of month',
          buttons: [
            { id: 'btn-1', type: ButtonType.URL, text: 'Shop Now', url: 'https://shop.example.com/sale' },
          ],
        });

        const result = service.transformToMetaFormat(group, translation);

        const header = findComponent(result.components, 'HEADER');
        expect(header?.format).toBe('IMAGE');
        expect(header?.example?.header_handle).toEqual(['https://cdn.example.com/summer-sale-banner.jpg']);
        expect(header?.text).toBeUndefined();
      });
    });
  });

  describe('extractVariables (private method)', () => {
    // Accessing private method for testing via type assertion
    const extractVariables = (text: string): string[] => {
      return (service as any)['extractVariables'](text);
    };

    it('should extract single variable', () => {
      const variables = extractVariables('Hello {{1}}');
      expect(variables).toEqual(['{{1}}']);
    });

    it('should extract multiple variables in order', () => {
      const variables = extractVariables('Hello {{1}}, your order {{2}} is {{3}}');
      expect(variables).toEqual(['{{1}}', '{{2}}', '{{3}}']);
    });

    it('should return empty array for text without variables', () => {
      const variables = extractVariables('Hello World');
      expect(variables).toEqual([]);
    });

    it('should handle variables with double-digit numbers', () => {
      const variables = extractVariables('Field {{10}} and {{11}}');
      expect(variables).toEqual(['{{10}}', '{{11}}']);
    });

    it('should return unique variables only', () => {
      const variables = extractVariables('Hello {{1}} and {{1}} again');
      expect(variables).toEqual(['{{1}}']);
    });
  });
});
