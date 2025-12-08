import { Response } from 'express';
import { BroadcastStatus } from './enums';
/**
 * Event structure for broadcast progress updates.
 */
export interface BroadcastProgressEvent {
    broadcastId: string;
    status: BroadcastStatus;
    sentCount: number;
    deliveredCount: number;
    readCount: number;
    failedCount: number;
    totalRecipients: number;
    completedAt?: Date;
}
/**
 * SSE event types sent to clients.
 */
export type SseEventType = 'progress' | 'status' | 'completed' | 'heartbeat' | 'error';
/**
 * Service for managing Server-Sent Events (SSE) connections for broadcast progress.
 *
 * Provides real-time updates to connected clients about broadcast sending progress,
 * including metrics and status changes.
 *
 * @remarks
 * - Uses Node.js EventEmitter for internal pub/sub
 * - Maintains heartbeat connections to keep SSE alive
 * - Handles client cleanup on disconnect
 * - Enforces connection limits per broadcast and per user
 */
export declare class BroadcastSseService {
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
     * Maximum SSE connections allowed per broadcast.
     * Prevents resource exhaustion from too many clients on one broadcast.
     */
    private static readonly MAX_CONNECTIONS_PER_BROADCAST;
    /**
     * Maximum SSE connections allowed per user across all broadcasts.
     * Prevents a single user from consuming too many server resources.
     */
    private static readonly MAX_CONNECTIONS_PER_USER;
    constructor();
    /**
     * Adds an SSE client for a specific broadcast.
     *
     * Sets up the SSE connection with proper headers and registers
     * the client for receiving progress updates.
     *
     * @param broadcastId - The broadcast ID to subscribe to
     * @param userId - The user ID for connection tracking
     * @param res - Express Response object for the SSE connection
     * @returns true if connection was established, false if rejected due to limits
     */
    addClient(broadcastId: string, userId: string, res: Response): boolean;
    /**
     * Sends an error response and closes the connection.
     * Used when connection limits are reached.
     */
    private sendErrorAndClose;
    /**
     * Removes an SSE client from the broadcast subscription.
     *
     * Cleans up heartbeat interval, removes client from tracking,
     * and decrements user connection count.
     *
     * @param broadcastId - The broadcast ID the client was subscribed to
     * @param client - The SSE client to remove
     */
    private removeClient;
    /**
     * Emits a progress update to all clients watching a specific broadcast.
     *
     * Automatically determines the event type based on the broadcast status
     * and sends appropriate events to all connected clients.
     *
     * @param event - The broadcast progress event to emit
     */
    emitProgress(event: BroadcastProgressEvent): void;
    /**
     * Sends a heartbeat event to keep the SSE connection alive.
     *
     * Heartbeats are sent as comments to avoid being parsed as events by clients
     * but still maintain the connection.
     *
     * @param res - Express Response object for the SSE connection
     */
    sendHeartbeat(res: Response): void;
    /**
     * Sends an SSE event to a specific client.
     *
     * Formats the event according to SSE specification with event type and JSON data.
     *
     * @param res - Express Response object for the SSE connection
     * @param eventType - Type of SSE event (progress, status, completed, heartbeat)
     * @param data - Event data to send (will be JSON serialized)
     */
    private sendEvent;
    /**
     * Sends the initial state of a broadcast to a newly connected client.
     *
     * Called immediately after a client connects to provide current state
     * before any progress updates arrive.
     *
     * @param res - Express Response object for the SSE connection
     * @param event - Current broadcast state
     */
    sendInitialState(res: Response, event: BroadcastProgressEvent): void;
    /**
     * Gets the count of connected clients for a specific broadcast.
     *
     * Useful for monitoring and debugging SSE connections.
     *
     * @param broadcastId - The broadcast ID to check
     * @returns Number of connected clients
     */
    getClientCount(broadcastId: string): number;
    /**
     * Closes all SSE connections for a specific broadcast.
     *
     * Used when a broadcast is completed or cancelled to clean up resources.
     *
     * @param broadcastId - The broadcast ID to close connections for
     */
    closeAllConnections(broadcastId: string): void;
}
