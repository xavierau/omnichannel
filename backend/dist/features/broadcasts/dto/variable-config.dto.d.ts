/**
 * DTO for configuring a single template variable.
 * Variables can be either static values or dynamically sourced from customer fields.
 */
export declare class VariableConfigDto {
    index: number;
    sourceType: 'static' | 'customer_field';
    staticValue?: string;
    customerField?: string;
}
/**
 * DTO for configuring header content in templates.
 * Supports text headers with variables or media headers with URLs.
 */
export declare class HeaderConfigDto {
    type: 'text' | 'image' | 'video' | 'document';
    textVariable?: VariableConfigDto;
    mediaUrl?: string;
}
/**
 * DTO for configuring button variables in templates.
 * Maps variables to specific buttons by index.
 */
export declare class ButtonVariableConfigDto {
    buttonIndex: number;
    variable: VariableConfigDto;
}
/**
 * DTO for the complete template variables configuration.
 * Contains all variable mappings for header, body, and buttons.
 */
export declare class TemplateVariablesConfigDto {
    header?: HeaderConfigDto;
    bodyVariables: VariableConfigDto[];
    buttonVariables?: ButtonVariableConfigDto[];
}
