"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateTransformerService = void 0;
const tsyringe_1 = require("tsyringe");
const enums_1 = require("../enums");
/**
 * Service for transforming local template format to Meta's Graph API format.
 *
 * This service handles the conversion between our internal template representation
 * and the format required by Meta's WhatsApp Business API for template management.
 */
let TemplateTransformerService = class TemplateTransformerService {
    /**
     * Transform local template to Meta API format.
     *
     * @param group - The template group containing name and category
     * @param translation - The template translation with content and buttons
     * @returns The formatted request for Meta's Graph API
     */
    transformToMetaFormat(group, translation) {
        const components = [];
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
    buildHeaderComponent(translation) {
        if (!translation.headerType || translation.headerType === enums_1.HeaderType.NONE) {
            return null;
        }
        const format = this.mapHeaderFormat(translation.headerType);
        const component = {
            type: 'HEADER',
            format,
        };
        if (translation.headerType === enums_1.HeaderType.TEXT) {
            component.text = translation.headerContent || '';
            const variables = this.extractVariables(translation.headerContent || '');
            if (variables.length > 0) {
                component.example = {
                    header_text: this.generateSampleValues(variables.length),
                };
            }
        }
        else {
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
    buildBodyComponent(translation) {
        const component = {
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
    buildFooterComponent(translation) {
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
    buildButtonsComponent(translation) {
        if (!translation.buttons || translation.buttons.length === 0) {
            return null;
        }
        const metaButtons = translation.buttons.map((button) => this.mapButton(button));
        return {
            type: 'BUTTONS',
            buttons: metaButtons,
        };
    }
    /**
     * Map a local button to Meta API button format.
     */
    mapButton(button) {
        const metaButton = {
            type: this.mapButtonType(button.type),
            text: button.text,
        };
        if (button.type === enums_1.ButtonType.URL && button.url) {
            metaButton.url = button.url;
        }
        if (button.type === enums_1.ButtonType.CALL && button.phoneNumber) {
            metaButton.phone_number = button.phoneNumber;
        }
        return metaButton;
    }
    /**
     * Map local category to Meta API category.
     */
    mapCategory(category) {
        const categoryMap = {
            [enums_1.TemplateCategory.MARKETING]: 'MARKETING',
            [enums_1.TemplateCategory.UTILITY]: 'UTILITY',
            [enums_1.TemplateCategory.AUTHENTICATION]: 'AUTHENTICATION',
        };
        return categoryMap[category];
    }
    /**
     * Map local header type to Meta API header format.
     */
    mapHeaderFormat(headerType) {
        const formatMap = {
            [enums_1.HeaderType.TEXT]: 'TEXT',
            [enums_1.HeaderType.IMAGE]: 'IMAGE',
            [enums_1.HeaderType.VIDEO]: 'VIDEO',
            [enums_1.HeaderType.DOCUMENT]: 'DOCUMENT',
        };
        return formatMap[headerType];
    }
    /**
     * Map local button type to Meta API button type.
     */
    mapButtonType(buttonType) {
        const typeMap = {
            [enums_1.ButtonType.QUICK_REPLY]: 'QUICK_REPLY',
            [enums_1.ButtonType.URL]: 'URL',
            [enums_1.ButtonType.CALL]: 'PHONE_NUMBER',
            [enums_1.ButtonType.COPY_CODE]: 'COPY_CODE',
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
    extractVariables(text) {
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
    generateSampleValues(count) {
        return Array.from({ length: count }, (_, i) => `Sample${i + 1}`);
    }
};
exports.TemplateTransformerService = TemplateTransformerService;
exports.TemplateTransformerService = TemplateTransformerService = __decorate([
    (0, tsyringe_1.singleton)()
], TemplateTransformerService);
