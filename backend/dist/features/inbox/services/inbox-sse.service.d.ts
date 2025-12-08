import { Response } from 'express';
/**
 * SSE event types for inbox real-time updates.
 */
export type InboxSseEventType = 'conversation:new' | 'conversation:message:new' | 'conversation:message:status' | 'conversation:assigned' | 'conversation:status:changed' | 'conversation:unread:updated' | 'note:created' | 'note:updated' | 'note:deleted' | 'heartbeat' | 'error';
/**
 * Service for managing Server-Sent Events (SSE) connections for inbox real-time updates.
 *
 * Provides real-time notifications to connected operators about:
 * - New conversations
 * - New messages and status updates
 * - Assignment changes
 * - Conversation status changes
 * - Note CRUD operations
 *
 * @remarks
 * - Uses Node.js EventEmitter for internal pub/sub
 * - Maintains heartbeat connections to keep SSE alive
 * - Handles client cleanup on disconnect
 * - Enforces connection limits per tenant and per user
 * - Clients are organized by tenantId for efficient broadcasting
 */
export declare class InboxSseService {
    private readonly emitter;
    private readonly clients;
    private readonly userConnections;
    /**
     * Heartbeat interval in milliseconds.
     * Sends a heartbeat every 30 seconds to keep the connection alive.
     */
    private static readonly HEARTBEAT_INTERVAL_MS;
    /**
     * Maximum listeners per event to prevent memory leaks.
     */
    private static readonly MAX_LISTENERS;
    /**
     * Maximum SSE connections allowed per tenant.
     * Prevents resource exhaustion from too many clients on one tenant.
     */
    private static readonly MAX_CONNECTIONS_PER_TENANT;
    /**
     * Maximum SSE connections allowed per user across all tenants.
     * Prevents a single user from consuming too many server resources.
     */
    private static readonly MAX_CONNECTIONS_PER_USER;
    constructor();
    /**
     * Adds an SSE client for real-time inbox updates.
     *
     * Sets up the SSE connection with proper headers and registers
     * the client for receiving inbox events.
     *
     * @param tenantId - The tenant ID for multi-tenancy isolation
     * @param userId - The user ID for connection tracking
     * @param res - Express Response object for the SSE connection
     * @returns true if connection was established, false if rejected due to limits
     */
    addClient(tenantId: string, userId: string, res: Response): boolean;
    /**
     * Removes an SSE client from the tenant subscription.
     *
     * Cleans up heartbeat interval, removes client from tracking,
     * and decrements user connection count.
     *
     * @param tenantId - The tenant ID the client was subscribed to
     * @param client - The SSE client to remove
     */
    private removeClient;
    /**
     * Emits an event to all clients of a specific tenant.
     *
     * @param tenantId - The tenant ID to broadcast to
     * @param eventType - Type of SSE event
     * @param data - Event data to send (will be JSON serialized)
     */
    emitToTenant(tenantId: string, eventType: InboxSseEventType, data: unknown): void;
    /**
     * Emits a conversation-specific event to all clients of a tenant.
     *
     * Automatically includes the conversationId in the event payload.
     *
     * @param tenantId - The tenant ID to broadcast to
     * @param conversationId - The conversation ID to include in the event
     * @param eventType - Type of SSE event
     * @param data - Additional event data to send
     */
    emitConversationEvent(tenantId: string, conversationId: string, eventType: InboxSseEventType, data: unknown): void;
    /**
     * Sends a heartbeat event to keep the SSE connection alive.
     *
     * @param res - Express Response object for the SSE connection
     */
    private sendHeartbeat;
    /**
     * Sends an SSE event to a specific client.
     *
     * Formats the event according to SSE specification with event type and JSON data.
     *
     * @param res - Express Response object for the SSE connection
     * @param eventType - Type of SSE event
     * @param data - Event data to send (will be JSON serialized)
     */
    private sendEvent;
    /**
     * Sends an error response and closes the connection.
     * Used when connection limits are reached.
     *
     * @param res - Express Response object
     * @param statusCode - HTTP status code to send
     * @param message - Error message
     */
    sendErrorAndClose(res: Response, statusCode: number, message: string): void;
    /**
     * Gets the count of connected clients for a specific tenant.
     *
     * Useful for monitoring and debugging SSE connections.
     *
     * @param tenantId - The tenant ID to check
     * @returns Number of connected clients
     */
    getClientCount(tenantId: string): number;
    /**
     * Closes all SSE connections for a specific tenant.
     *
     * Used when tenant access is revoked or for maintenance purposes.
     *
     * @param tenantId - The tenant ID to close connections for
     */
    closeAllConnections(tenantId: string): void;
}
