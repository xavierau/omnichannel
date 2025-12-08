import { Request, Response } from 'express';
import { ConversationService } from './services/conversation.service';
import { InboxNoteService } from './services/inbox-note.service';
import { ConversationMessageRepository } from './repositories/conversation-message.repository';
/**
 * Controller for inbox (conversation) operations.
 *
 * Handles HTTP request/response mapping for:
 * - Conversation listing and retrieval
 * - Message listing and sending
 * - Conversation assignment (pickup, release, transfer)
 * - Status management
 * - Internal notes CRUD
 *
 * All operations enforce team-based access control through the ConversationService.
 */
export declare class InboxController {
    private conversationService;
    private noteService;
    private messageRepository;
    constructor(conversationService: ConversationService, noteService: InboxNoteService, messageRepository: ConversationMessageRepository);
    /**
     * GET /operators
     * List operators (users) available for conversation assignment.
     * Returns users who belong to active teams within the tenant.
     */
    listOperators: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * GET /conversations
     * List conversations accessible to the current user.
     * Supports filtering, searching, pagination, and sorting.
     */
    listConversations: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * GET /conversations/:id
     * Get a single conversation by ID with access validation.
     */
    getConversation: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * GET /conversations/:id/messages
     * Get paginated messages for a conversation.
     * Returns messages in descending order (newest first).
     */
    getMessages: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * POST /conversations/:id/messages
     * Send a new message in a conversation.
     *
     * Supports content types: text, image, document, audio, template.
     * Creates the message record and queues it for delivery.
     */
    sendMessage: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * POST /conversations/:id/pickup
     * Pick up an unassigned conversation.
     * Assigns the conversation to the current user.
     */
    pickupConversation: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * POST /conversations/:id/release
     * Release a conversation back to the unassigned pool.
     * Only the assigned operator can release a conversation.
     */
    releaseConversation: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * POST /conversations/:id/assign
     * Assign a conversation to another user.
     * Requires inbox:assign:all permission.
     */
    assignConversation: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * PATCH /conversations/:id/status
     * Update the status of a conversation.
     * Status transitions are validated by the service layer.
     */
    updateStatus: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * PATCH /conversations/:id/mark-read
     * Mark a conversation as read by resetting the unread count.
     */
    markAsRead: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * GET /conversations/:id/notes
     * Get all notes for a conversation.
     * Returns notes in descending order (newest first).
     *
     * Optional query parameter:
     * - scope: Filter by note scope ('conversation' | 'customer')
     */
    getNotes: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * POST /conversations/:id/notes
     * Create a new note on a conversation.
     *
     * Request body:
     * - content: string (required) - Note content
     * - scope: 'conversation' | 'customer' (optional, defaults to 'conversation')
     * - mentions: string[] (optional) - Array of user IDs to mention
     */
    createNote: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * PATCH /notes/:id
     * Update an existing note.
     * Only the note creator can update their notes.
     *
     * Request body:
     * - content: string (optional) - Updated note content
     * - mentions: string[] (optional) - Updated array of user IDs to mention
     */
    updateNote: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * DELETE /notes/:id
     * Delete a note.
     * Only the note creator can delete their notes.
     */
    deleteNote: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * Builds the message content object based on content type.
     * Validates that the required content field is present for the given type.
     *
     * @param contentType - The type of message content
     * @param text - Text content (required for TEXT type)
     * @param media - Media content (required for IMAGE, DOCUMENT, AUDIO types)
     * @param template - Template content (required for TEMPLATE type)
     * @returns The message content object
     * @throws BadRequestException if required content is missing
     */
    private buildMessageContent;
}
