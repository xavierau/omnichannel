/**
 * Inbox Repositories
 *
 * This module exports all repositories for the inbox feature:
 * - ConversationRepository: Core conversation management with team-based access control
 * - ConversationMessageRepository: Message CRUD and delivery status tracking
 * - ConversationNoteRepository: Internal notes with @mentions support
 * - ConversationAssignmentRepository: Audit trail for conversation assignments
 */
export { ConversationRepository, ConversationQueryOptions, PaginatedResult, } from './conversation.repository';
export { ConversationMessageRepository, PaginationOptions, DeliveryStatusTimestamps, PaginatedResult as MessagePaginatedResult, } from './conversation-message.repository';
export { ConversationNoteRepository } from './conversation-note.repository';
export { ConversationAssignmentRepository } from './conversation-assignment.repository';
