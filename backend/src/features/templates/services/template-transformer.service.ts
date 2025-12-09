import { singleton } from 'tsyringe';
import { WhatsAppTemplateGroup } from '../template-group.entity';
import { TemplateTranslation, TemplateButton } from '../template-translation.entity';
import { HeaderType, ButtonType, TemplateCategory } from '../enums';

/**
 * Meta API category values.
 */
export type MetaCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

/**
 * Meta API header format values.
 */
export type MetaHeaderFormat = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';

/**
 * Meta API button type values.
 */
export type MetaButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'COPY_CODE';

/**
 * Meta API component type values.
 */
export type MetaComponentType = 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';

/**
 * Meta API button structure.
 */
export interface MetaButton {
  type: MetaButtonType;
  text: string;
  url?: string;
  phone_number?: string;
}

/**
 * Meta API component example structure.
 */
export interface MetaComponentExample {
  header_text?: string[];
  header_handle?: string[];
  body_text?: string[][];
}

/**
 * Meta API component structure.
 */
export interface MetaComponent {
  type: MetaComponentType;
  format?: MetaHeaderFormat;
  text?: string;
  buttons?: MetaButton[];
  example?: MetaComponentExample;
}

/**
 * Meta Graph API template request structure.
 */
export interface MetaTemplateRequest {
  name: string;
  language: string;
  category: MetaCategory;
  components: MetaComponent[];
}

/**
 * Service for transforming local template format to Meta's Graph API format.
 *
 * This service handles the conversion between our internal template representation
 * and the format required by Meta's WhatsApp Business API for template management.
 */
@singleton()
export class TemplateTransformerService {
  /**
   * Transform local template to Meta API format.
   *
   * @param group - The template group containing name and category
   * @param translation - The template translation with content and buttons
   * @returns The formatted request for Meta's Graph API
   */
  transformToMetaFormat(
    group: WhatsAppTemplateGroup,
    translation: TemplateTranslation
  ): MetaTemplateRequest {
    const components: MetaComponent[] = [];

    const headerComponent = this.buildHeaderComponent(translation);
    if (headerComponent) {
      components.push(headerComponent);
    }

    components.push(this.buildBodyComponent(translation));

    const footerComponent = this.buildFooterComponent(translation);
    if (footerComponent) {
      components.push(footerComponent);
    }

    const buttonsComponent = this.buildButtonsComponent(translation);
    if (buttonsComponent) {
      components.push(buttonsComponent);
    }

    return {
      name: group.name,
      language: translation.language,
      category: this.mapCategory(group.category),
      components,
    };
  }

  /**
   * Build header component from translation.
   * Returns null if header type is NONE or null.
   */
  private buildHeaderComponent(translation: TemplateTranslation): MetaComponent | null {
    if (!translation.headerType || translation.headerType === HeaderType.NONE) {
      return null;
    }

    const format = this.mapHeaderFormat(translation.headerType);
    const component: MetaComponent = {
      type: 'HEADER',
      format,
    };

    if (translation.headerType === HeaderType.TEXT) {
      component.text = translation.headerContent || '';
      const variables = this.extractVariables(translation.headerContent || '');
      if (variables.length > 0) {
        component.example = {
          header_text: this.generateSampleValues(variables.length),
        };
      }
    } else {
      // For media types (IMAGE, VIDEO, DOCUMENT), use header_handle
      if (translation.headerContent) {
        component.example = {
          header_handle: [translation.headerContent],
        };
      }
    }

    return component;
  }

  /**
   * Build body component from translation.
   * Body is always required.
   */
  private buildBodyComponent(translation: TemplateTranslation): MetaComponent {
    const component: MetaComponent = {
      type: 'BODY',
      text: translation.body,
    };

    const variables = this.extractVariables(translation.body);
    if (variables.length > 0) {
      component.example = {
        body_text: [this.generateSampleValues(variables.length)],
      };
    }

    return component;
  }

  /**
   * Build footer component from translation.
   * Returns null if footer is null or empty.
   */
  private buildFooterComponent(translation: TemplateTranslation): MetaComponent | null {
    if (!translation.footer || translation.footer.trim() === '') {
      return null;
    }

    return {
      type: 'FOOTER',
      text: translation.footer,
    };
  }

  /**
   * Build buttons component from translation.
   * Returns null if no buttons are present.
   */
  private buildButtonsComponent(translation: TemplateTranslation): MetaComponent | null {
    if (!translation.buttons || translation.buttons.length === 0) {
      return null;
    }

    const metaButtons: MetaButton[] = translation.buttons.map((button) =>
      this.mapButton(button)
    );

    return {
      type: 'BUTTONS',
      buttons: metaButtons,
    };
  }

  /**
   * Map a local button to Meta API button format.
   */
  private mapButton(button: TemplateButton): MetaButton {
    const metaButton: MetaButton = {
      type: this.mapButtonType(button.type),
      text: button.text,
    };

    if (button.type === ButtonType.URL && button.url) {
      metaButton.url = button.url;
    }

    if (button.type === ButtonType.CALL && button.phoneNumber) {
      metaButton.phone_number = button.phoneNumber;
    }

    return metaButton;
  }

  /**
   * Map local category to Meta API category.
   */
  private mapCategory(category: TemplateCategory): MetaCategory {
    const categoryMap: Record<TemplateCategory, MetaCategory> = {
      [TemplateCategory.MARKETING]: 'MARKETING',
      [TemplateCategory.UTILITY]: 'UTILITY',
      [TemplateCategory.AUTHENTICATION]: 'AUTHENTICATION',
    };
    return categoryMap[category];
  }

  /**
   * Map local header type to Meta API header format.
   */
  private mapHeaderFormat(headerType: HeaderType): MetaHeaderFormat {
    const formatMap: Record<Exclude<HeaderType, HeaderType.NONE>, MetaHeaderFormat> = {
      [HeaderType.TEXT]: 'TEXT',
      [HeaderType.IMAGE]: 'IMAGE',
      [HeaderType.VIDEO]: 'VIDEO',
      [HeaderType.DOCUMENT]: 'DOCUMENT',
    };
    return formatMap[headerType as Exclude<HeaderType, HeaderType.NONE>];
  }

  /**
   * Map local button type to Meta API button type.
   */
  private mapButtonType(buttonType: ButtonType): MetaButtonType {
    const typeMap: Record<ButtonType, MetaButtonType> = {
      [ButtonType.QUICK_REPLY]: 'QUICK_REPLY',
      [ButtonType.URL]: 'URL',
      [ButtonType.CALL]: 'PHONE_NUMBER',
      [ButtonType.COPY_CODE]: 'COPY_CODE',
    };
    return typeMap[buttonType];
  }

  /**
   * Extract variable placeholders from text.
   * Variables are in the format {{1}}, {{2}}, etc.
   *
   * @param text - The text to extract variables from
   * @returns Array of unique variable placeholders found
   */
  private extractVariables(text: string): string[] {
    const regex = /\{\{\d+\}\}/g;
    const matches = text.match(regex);
    if (!matches) {
      return [];
    }
    // Return unique variables only
    return [...new Set(matches)];
  }

  /**
   * Generate sample values for variables.
   *
   * @param count - Number of sample values to generate
   * @returns Array of sample values like ['Sample1', 'Sample2', ...]
   */
  private generateSampleValues(count: number): string[] {
    return Array.from({ length: count }, (_, i) => `Sample${i + 1}`);
  }
}
