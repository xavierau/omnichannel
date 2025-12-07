/**
 * Inbox Service
 *
 * Handles all inbox/conversation-related API calls including
 * conversation management, messaging, assignments, and notes.
 */

import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  buildQueryString,
} from './api-client'
import type { PaginatedResponse, ApiResponse } from './api-client'

const API_BASE_URL = '/api/inbox'

// ============================================================================
// Constants
// ============================================================================

export const ConversationStatus = {
  UNASSIGNED: 'unassigned',
  ACTIVE: 'active',
  WAITING: 'waiting',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const

export type ConversationStatus = (typeof ConversationStatus)[keyof typeof ConversationStatus]

export const MessageDirection = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
} as const

export type MessageDirection = (typeof MessageDirection)[keyof typeof MessageDirection]

export const MessageContentType = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  TEMPLATE: 'template',
  LOCATION: 'location',
  STICKER: 'sticker',
  CONTACT: 'contact',
  REACTION: 'reaction',
  INTERACTIVE: 'interactive',
} as const

export type MessageContentType = (typeof MessageContentType)[keyof typeof MessageContentType]

export const MessageDeliveryStatus = {
  PENDING: 'pending',
  QUEUED: 'queued',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
} as const

export type MessageDeliveryStatus = (typeof MessageDeliveryStatus)[keyof typeof MessageDeliveryStatus]

export const NoteScope = {
  CONVERSATION: 'conversation',
  CUSTOMER: 'customer',
} as const

export type NoteScope = (typeof NoteScope)[keyof typeof NoteScope]

// ============================================================================
// Types
// ============================================================================

export interface ConversationCustomer {
  id: string
  name: string
  whatsappNumber: string
}

export interface ConversationAssignee {
  id: string
  firstName: string
  lastName: string
  email: string
}

export interface Conversation {
  id: string
  customerId: string
  customer: ConversationCustomer
  channelAccountId: string
  status: ConversationStatus
  assignedToId: string | null
  assignedTo: ConversationAssignee | null
  unreadCount: number
  lastMessageAt: string | null
  lastMessagePreview: string | null
  createdAt: string
  updatedAt: string
}

export interface TextContent {
  body: string
}

export interface MediaContent {
  url: string
  mimeType?: string
  caption?: string
  filename?: string
}

export interface TemplateContent {
  name: string
  language: string
  variables?: Record<string, unknown>
}

export interface LocationContent {
  latitude: number
  longitude: number
  name?: string
  address?: string
}

export interface ContactContent {
  name: string
  phones: Array<{ phone: string; type?: string }>
}

export interface ReactionContent {
  emoji: string
  messageId: string
}

export type MessageContent =
  | TextContent
  | MediaContent
  | TemplateContent
  | LocationContent
  | ContactContent
  | ReactionContent
  | Record<string, unknown>

export interface Message {
  id: string
  conversationId: string
  direction: MessageDirection
  contentType: MessageContentType
  content: MessageContent
  externalMessageId: string | null
  deliveryStatus: MessageDeliveryStatus
  sentById: string | null
  sentAt: string | null
  deliveredAt: string | null
  readAt: string | null
  failedReason: string | null
  createdAt: string
  updatedAt: string
}

export interface InboxNote {
  id: string
  conversationId: string
  customerId: string | null
  scope: NoteScope
  content: string
  createdById: string
  createdBy: {
    id: string
    firstName: string
    lastName: string
  }
  mentions: string[]
  createdAt: string
  updatedAt: string
}

export interface Operator {
  id: string
  firstName: string
  lastName: string
  email: string
  isOnline: boolean
  activeConversationCount: number
}

export interface ConversationQuery {
  status?: ConversationStatus | ConversationStatus[]
  search?: string
  page?: number
  limit?: number
  sortBy?: 'lastMessageAt' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

export interface MessageQuery {
  page?: number
  limit?: number
}

export interface SendTextMessageData {
  contentType: typeof MessageContentType.TEXT
  text: {
    content: string
  }
}

export interface SendMediaMessageData {
  contentType:
    | typeof MessageContentType.IMAGE
    | typeof MessageContentType.VIDEO
    | typeof MessageContentType.AUDIO
    | typeof MessageContentType.DOCUMENT
  media: {
    url: string
    mimeType?: string
    caption?: string
    filename?: string
  }
}

export interface SendTemplateMessageData {
  contentType: typeof MessageContentType.TEMPLATE
  template: {
    name: string
    language: string
    variables?: Record<string, unknown>
  }
}

export interface SendLocationMessageData {
  contentType: typeof MessageContentType.LOCATION
  location: {
    latitude: number
    longitude: number
    name?: string
    address?: string
  }
}

export interface SendReactionData {
  contentType: typeof MessageContentType.REACTION
  reaction: {
    emoji: string
    messageId: string
  }
}

export type SendMessageData =
  | SendTextMessageData
  | SendMediaMessageData
  | SendTemplateMessageData
  | SendLocationMessageData
  | SendReactionData

export interface CreateNoteData {
  content: string
  scope?: NoteScope
  mentions?: string[]
}

export interface UpdateNoteData {
  content?: string
  mentions?: string[]
}

// ============================================================================
// Service
// ============================================================================

export const inboxService = {
  // ============================================================================
  // Conversation Operations
  // ============================================================================

  /**
   * Get paginated list of conversations
   */
  async getConversations(
    query?: ConversationQuery
  ): Promise<PaginatedResponse<Conversation>> {
    const queryParams: Record<string, string | number | boolean | undefined> = {
      search: query?.search,
      page: query?.page,
      limit: query?.limit,
      sortBy: query?.sortBy,
      sortOrder: query?.sortOrder,
    }

    // Handle status which can be single or array
    let queryString = buildQueryString(queryParams)
    if (query?.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status]
      const statusParams = statuses
        .map((s) => `status=${encodeURIComponent(s)}`)
        .join('&')
      queryString = queryString ? `${queryString}&${statusParams}` : `?${statusParams}`
    }

    return apiGet<PaginatedResponse<Conversation>>(
      `${API_BASE_URL}/conversations${queryString}`
    )
  },

  /**
   * Get a single conversation by ID
   */
  async getConversation(id: string): Promise<Conversation> {
    const response = await apiGet<ApiResponse<Conversation>>(
      `${API_BASE_URL}/conversations/${id}`
    )
    return response.data
  },

  /**
   * Get paginated messages for a conversation
   */
  async getMessages(
    conversationId: string,
    query?: MessageQuery
  ): Promise<PaginatedResponse<Message>> {
    const queryString = buildQueryString({
      page: query?.page,
      limit: query?.limit,
    })

    return apiGet<PaginatedResponse<Message>>(
      `${API_BASE_URL}/conversations/${conversationId}/messages${queryString}`
    )
  },

  /**
   * Send a message in a conversation
   */
  async sendMessage(conversationId: string, data: SendMessageData): Promise<Message> {
    const response = await apiPost<ApiResponse<Message>, SendMessageData>(
      `${API_BASE_URL}/conversations/${conversationId}/messages`,
      data
    )
    return response.data
  },

  // ============================================================================
  // Assignment Operations
  // ============================================================================

  /**
   * Pick up an unassigned conversation
   */
  async pickupConversation(id: string): Promise<Conversation> {
    const response = await apiPost<ApiResponse<Conversation>>(
      `${API_BASE_URL}/conversations/${id}/pickup`
    )
    return response.data
  },

  /**
   * Release a conversation back to unassigned pool
   */
  async releaseConversation(id: string): Promise<Conversation> {
    const response = await apiPost<ApiResponse<Conversation>>(
      `${API_BASE_URL}/conversations/${id}/release`
    )
    return response.data
  },

  /**
   * Assign a conversation to a specific user
   */
  async assignConversation(id: string, userId: string): Promise<Conversation> {
    const response = await apiPost<ApiResponse<Conversation>, { userId: string }>(
      `${API_BASE_URL}/conversations/${id}/assign`,
      { userId }
    )
    return response.data
  },

  // ============================================================================
  // Status Management
  // ============================================================================

  /**
   * Update the status of a conversation
   */
  async updateStatus(id: string, status: ConversationStatus): Promise<Conversation> {
    const response = await apiPatch<
      ApiResponse<Conversation>,
      { status: ConversationStatus }
    >(`${API_BASE_URL}/conversations/${id}/status`, { status })
    return response.data
  },

  /**
   * Mark a conversation as read
   */
  async markAsRead(id: string): Promise<Conversation> {
    const response = await apiPatch<ApiResponse<Conversation>, Record<string, never>>(
      `${API_BASE_URL}/conversations/${id}/mark-read`,
      {}
    )
    return response.data
  },

  // ============================================================================
  // Note Operations
  // ============================================================================

  /**
   * Get notes for a conversation
   */
  async getNotes(conversationId: string, scope?: NoteScope): Promise<InboxNote[]> {
    const queryString = scope ? `?scope=${encodeURIComponent(scope)}` : ''
    const response = await apiGet<ApiResponse<InboxNote[]>>(
      `${API_BASE_URL}/conversations/${conversationId}/notes${queryString}`
    )
    return response.data
  },

  /**
   * Create a note on a conversation
   */
  async createNote(
    conversationId: string,
    data: CreateNoteData
  ): Promise<InboxNote> {
    const response = await apiPost<ApiResponse<InboxNote>, CreateNoteData>(
      `${API_BASE_URL}/conversations/${conversationId}/notes`,
      data
    )
    return response.data
  },

  /**
   * Update a note
   */
  async updateNote(noteId: string, data: UpdateNoteData): Promise<InboxNote> {
    const response = await apiPatch<ApiResponse<InboxNote>, UpdateNoteData>(
      `${API_BASE_URL}/notes/${noteId}`,
      data
    )
    return response.data
  },

  /**
   * Delete a note
   */
  async deleteNote(noteId: string): Promise<void> {
    await apiDelete(`${API_BASE_URL}/notes/${noteId}`)
  },

  // ============================================================================
  // Operator Operations
  // ============================================================================

  /**
   * Get list of available operators
   */
  async getOperators(): Promise<Operator[]> {
    const response = await apiGet<ApiResponse<Operator[]>>(
      `${API_BASE_URL}/operators`
    )
    return response.data
  },
}
