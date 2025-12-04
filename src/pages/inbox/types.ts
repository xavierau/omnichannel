import type { CustomFieldsData } from "@/types/custom-fields"

// Operator Types
export type OperatorStatus = "online" | "offline" | "busy"

export interface Operator {
  id: string
  name: string
  email: string
  avatar?: string
  status: OperatorStatus
}

// Conversation Types
export type ConversationStatus = "unassigned" | "active" | "waiting" | "resolved" | "closed"
export type ChannelType = "whatsapp"

export interface Conversation {
  id: string
  customerId: string
  customerName: string
  customerWhatsappNumber: string
  customerAvatar?: string
  channel: ChannelType
  status: ConversationStatus
  assignedToId: string | null
  assignedToName: string | null
  messages: Message[]
  unreadCount: number
  lastMessageAt: Date
  lastMessagePreview: string
  customFields?: CustomFieldsData
  createdAt: Date
  updatedAt: Date
}

// Message Types
export type MessageDirection = "inbound" | "outbound"
export type MessageType = "text" | "image" | "document" | "audio" | "template" | "system"
export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed"

export interface MessageAttachment {
  type: "image" | "document" | "audio"
  url: string
  filename?: string
  mimeType?: string
  size?: number
  duration?: number // For audio
}

export interface Message {
  id: string
  conversationId: string
  direction: MessageDirection
  type: MessageType
  content: string
  attachment?: MessageAttachment
  templateId?: string
  templateName?: string
  status: MessageStatus
  timestamp: Date
  operatorId?: string
  operatorName?: string
}

// Inbox Settings
export type VisibilityMode = "own_only" | "team_readonly" | "full_access"

export interface InboxSettings {
  visibilityMode: VisibilityMode
}

// Filters
export interface ConversationFilters {
  search: string
  statuses: ConversationStatus[]
  assignedTo: "unassigned" | "mine" | "all"
}

export const defaultFilters: ConversationFilters = {
  search: "",
  statuses: [],
  assignedTo: "all",
}

// Constants
export const CONVERSATION_STATUSES: { value: ConversationStatus; label: string; color: string }[] = [
  { value: "unassigned", label: "Unassigned", color: "yellow" },
  { value: "active", label: "Active", color: "green" },
  { value: "waiting", label: "Waiting", color: "blue" },
  { value: "resolved", label: "Resolved", color: "gray" },
  { value: "closed", label: "Closed", color: "gray" },
]

export const OPERATOR_STATUSES: { value: OperatorStatus; label: string; color: string }[] = [
  { value: "online", label: "Online", color: "green" },
  { value: "offline", label: "Offline", color: "gray" },
  { value: "busy", label: "Busy", color: "red" },
]

export const VISIBILITY_MODES: { value: VisibilityMode; label: string; description: string }[] = [
  { value: "own_only", label: "Own Only", description: "See only conversations assigned to you" },
  { value: "team_readonly", label: "Team View", description: "See all conversations, edit only yours" },
  { value: "full_access", label: "Full Access", description: "See and manage all conversations" },
]

export const MESSAGE_TYPES: { value: MessageType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "image", label: "Image" },
  { value: "document", label: "Document" },
  { value: "audio", label: "Voice Note" },
  { value: "template", label: "Template" },
  { value: "system", label: "System" },
]

// Note Types
export type NoteScope = "conversation" | "customer"
export type NoteFilterScope = "all" | "conversation" | "customer"

export interface NoteMention {
  operatorId: string
  operatorName: string
  startIndex: number
  endIndex: number
}

export interface Note {
  id: string
  scope: NoteScope
  conversationId: string
  customerId: string
  content: string
  mentions: NoteMention[]
  authorId: string
  authorName: string
  authorAvatar?: string
  createdAt: Date
  updatedAt: Date
}

// API contract types for future backend
export interface CreateNoteRequest {
  scope: NoteScope
  conversationId: string
  customerId: string
  content: string
  mentions: NoteMention[]
}

export interface UpdateNoteRequest {
  id: string
  content: string
  mentions: NoteMention[]
}

// Constants
export const NOTE_SCOPES: { value: NoteScope; label: string; description: string }[] = [
  { value: "conversation", label: "This Conversation", description: "Note visible only in this conversation" },
  { value: "customer", label: "Customer", description: "Note visible across all conversations with this customer" },
]

export const NOTE_FILTER_SCOPES: { value: NoteFilterScope; label: string }[] = [
  { value: "all", label: "All Notes" },
  { value: "conversation", label: "This Conversation Only" },
  { value: "customer", label: "Customer-wide Only" },
]
