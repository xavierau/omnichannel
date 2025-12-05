import { Broadcast, TemplateVariablesConfig, VariableConfig, HeaderConfig, ButtonVariableConfig } from './broadcast.entity';
import { BroadcastStatus, RecipientType } from './enums';
import { TemplateCategory } from '../templates/enums';

/**
 * Response structure for variable configuration.
 */
export interface VariableConfigResponse {
  index: number;
  sourceType: 'static' | 'customer_field';
  staticValue?: string;
  customerField?: string;
}

/**
 * Response structure for header configuration.
 */
export interface HeaderConfigResponse {
  type: 'text' | 'image' | 'video' | 'document';
  textVariable?: VariableConfigResponse;
  mediaUrl?: string;
}

/**
 * Response structure for button variable configuration.
 */
export interface ButtonVariableConfigResponse {
  buttonIndex: number;
  variable: VariableConfigResponse;
}

/**
 * Response structure for template variables configuration.
 */
export interface TemplateVariablesConfigResponse {
  header?: HeaderConfigResponse;
  bodyVariables: VariableConfigResponse[];
  buttonVariables: ButtonVariableConfigResponse[];
}

/**
 * Full response structure for a single broadcast.
 */
export interface BroadcastResponse {
  id: string;
  name: string;
  description: string | null;
  templateId: string;
  templateName: string;
  templateCategory: TemplateCategory;
  templateLanguage: string;
  recipientType: RecipientType;
  groupId: string | null;
  customerIds: string[] | null;
  totalRecipients: number;
  templateVariables: TemplateVariablesConfigResponse;
  isImmediate: boolean;
  scheduledAt: Date | null;
  timezone: string;
  status: BroadcastStatus;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  customFields: Record<string, unknown>;
}

/**
 * Lightweight response structure for list view.
 * Excludes detailed configurations to reduce payload size.
 */
export interface BroadcastListResponse {
  id: string;
  name: string;
  description: string | null;
  templateName: string;
  templateCategory: TemplateCategory;
  recipientType: RecipientType;
  totalRecipients: number;
  isImmediate: boolean;
  scheduledAt: Date | null;
  status: BroadcastStatus;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Response structure for paginated broadcast list.
 */
export interface PaginatedBroadcastResponse {
  data: BroadcastListResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Transforms a VariableConfig to its response format.
 */
function toVariableConfigResponse(config: VariableConfig): VariableConfigResponse {
  return {
    index: config.index,
    sourceType: config.sourceType,
    ...(config.staticValue !== undefined && { staticValue: config.staticValue }),
    ...(config.customerField !== undefined && { customerField: config.customerField }),
  };
}

/**
 * Transforms a HeaderConfig to its response format.
 */
function toHeaderConfigResponse(config: HeaderConfig): HeaderConfigResponse {
  return {
    type: config.type,
    ...(config.textVariable && { textVariable: toVariableConfigResponse(config.textVariable) }),
    ...(config.mediaUrl !== undefined && { mediaUrl: config.mediaUrl }),
  };
}

/**
 * Transforms a ButtonVariableConfig to its response format.
 */
function toButtonVariableConfigResponse(config: ButtonVariableConfig): ButtonVariableConfigResponse {
  return {
    buttonIndex: config.buttonIndex,
    variable: toVariableConfigResponse(config.variable),
  };
}

/**
 * Transforms a TemplateVariablesConfig to its response format.
 */
function toTemplateVariablesConfigResponse(
  config: TemplateVariablesConfig
): TemplateVariablesConfigResponse {
  return {
    ...(config.header && { header: toHeaderConfigResponse(config.header) }),
    bodyVariables: config.bodyVariables.map(toVariableConfigResponse),
    buttonVariables: config.buttonVariables.map(toButtonVariableConfigResponse),
  };
}

/**
 * Transforms a Broadcast entity to its full API response format.
 * Used for single broadcast responses (get by ID, create, update).
 *
 * @param broadcast - The broadcast entity to transform
 * @returns The full broadcast response object
 */
export function toBroadcastResponse(broadcast: Broadcast): BroadcastResponse {
  return {
    id: broadcast.id,
    name: broadcast.name,
    description: broadcast.description,
    templateId: broadcast.templateId,
    templateName: broadcast.templateName,
    templateCategory: broadcast.templateCategory,
    templateLanguage: broadcast.templateLanguage,
    recipientType: broadcast.recipientType,
    groupId: broadcast.groupId,
    customerIds: broadcast.customerIds,
    totalRecipients: broadcast.totalRecipients,
    templateVariables: toTemplateVariablesConfigResponse(broadcast.templateVariables),
    isImmediate: broadcast.isImmediate,
    scheduledAt: broadcast.scheduledAt,
    timezone: broadcast.timezone,
    status: broadcast.status,
    sentCount: broadcast.sentCount,
    deliveredCount: broadcast.deliveredCount,
    readCount: broadcast.readCount,
    failedCount: broadcast.failedCount,
    createdBy: broadcast.createdBy,
    createdAt: broadcast.createdAt,
    updatedAt: broadcast.updatedAt,
    completedAt: broadcast.completedAt,
    customFields: broadcast.customFields || {},
  };
}

/**
 * Transforms a Broadcast entity to its lightweight list response format.
 * Used for list endpoints to reduce payload size.
 *
 * @param broadcast - The broadcast entity to transform
 * @returns The lightweight broadcast response object
 */
export function toBroadcastListResponse(broadcast: Broadcast): BroadcastListResponse {
  return {
    id: broadcast.id,
    name: broadcast.name,
    description: broadcast.description,
    templateName: broadcast.templateName,
    templateCategory: broadcast.templateCategory,
    recipientType: broadcast.recipientType,
    totalRecipients: broadcast.totalRecipients,
    isImmediate: broadcast.isImmediate,
    scheduledAt: broadcast.scheduledAt,
    status: broadcast.status,
    sentCount: broadcast.sentCount,
    deliveredCount: broadcast.deliveredCount,
    readCount: broadcast.readCount,
    failedCount: broadcast.failedCount,
    createdAt: broadcast.createdAt,
    updatedAt: broadcast.updatedAt,
  };
}

/**
 * Transforms a paginated broadcast result to its API response format.
 *
 * @param data - Array of broadcast entities
 * @param total - Total number of broadcasts matching the query
 * @param page - Current page number
 * @param limit - Items per page
 * @param totalPages - Total number of pages
 * @returns The paginated broadcast response object
 */
export function toPaginatedBroadcastResponse(
  data: Broadcast[],
  total: number,
  page: number,
  limit: number,
  totalPages: number
): PaginatedBroadcastResponse {
  return {
    data: data.map(toBroadcastListResponse),
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}
