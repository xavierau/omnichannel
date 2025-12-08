"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BroadcastSseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastSseService = void 0;
const tsyringe_1 = require("tsyringe");
const events_1 = require("events");
const enums_1 = require("./enums");
const logger_config_1 = require("../../config/logger.config");
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
let BroadcastSseService = class BroadcastSseService {
    static { BroadcastSseService_1 = this; }
    emitter = new events_1.EventEmitter();
    clients = new Map();
    userConnections = new Map();
    /**
     * Heartbeat interval in milliseconds.
     * Sends a heartbeat every 30 seconds to keep the connection alive.
     */
    static HEARTBEAT_INTERVAL_MS = 30000;
    /**
     * Maximum listeners per event to prevent memory leaks.
     */
    static MAX_LISTENERS = 100;
    /**
     * Maximum SSE connections allowed per broadcast.
     * Prevents resource exhaustion from too many clients on one broadcast.
     */
    static MAX_CONNECTIONS_PER_BROADCAST = 50;
    /**
     * Maximum SSE connections allowed per user across all broadcasts.
     * Prevents a single user from consuming too many server resources.
     */
    static MAX_CONNECTIONS_PER_USER = 10;
    constructor() {
        this.emitter.setMaxListeners(BroadcastSseService_1.MAX_LISTENERS);
    }
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
    addClient(broadcastId, userId, res) {
        // Check per-broadcast connection limit
        const broadcastClientCount = this.clients.get(broadcastId)?.size ?? 0;
        if (broadcastClientCount >= BroadcastSseService_1.MAX_CONNECTIONS_PER_BROADCAST) {
            this.sendErrorAndClose(res, 503, 'Too many connections for this broadcast');
            logger_config_1.logger.warn('SSE connection rejected: broadcast limit reached', {
                broadcastId,
                currentCount: broadcastClientCount,
                limit: BroadcastSseService_1.MAX_CONNECTIONS_PER_BROADCAST,
            });
            return false;
        }
        // Check per-user connection limit
        const userConnectionCount = this.userConnections.get(userId) ?? 0;
        if (userConnectionCount >= BroadcastSseService_1.MAX_CONNECTIONS_PER_USER) {
            this.sendErrorAndClose(res, 503, 'Too many SSE connections for this user');
            logger_config_1.logger.warn('SSE connection rejected: user limit reached', {
                userId,
                currentCount: userConnectionCount,
                limit: BroadcastSseService_1.MAX_CONNECTIONS_PER_USER,
            });
            return false;
        }
        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
        // Flush headers immediately
        res.flushHeaders();
        // Create heartbeat interval
        const heartbeatInterval = setInterval(() => {
            this.sendHeartbeat(res);
        }, BroadcastSseService_1.HEARTBEAT_INTERVAL_MS);
        // Create client entry
        const client = {
            res,
            heartbeatInterval,
            userId,
        };
        // Register client for this broadcast
        if (!this.clients.has(broadcastId)) {
            this.clients.set(broadcastId, new Set());
        }
        this.clients.get(broadcastId).add(client);
        // Track user connection count
        this.userConnections.set(userId, userConnectionCount + 1);
        // Set up event listener for this broadcast
        const progressHandler = (event) => {
            this.sendEvent(res, 'progress', event);
        };
        this.emitter.on(`progress:${broadcastId}`, progressHandler);
        // Handle client disconnect
        res.on('close', () => {
            this.removeClient(broadcastId, client);
            this.emitter.off(`progress:${broadcastId}`, progressHandler);
            logger_config_1.logger.debug('SSE client disconnected', { broadcastId, userId });
        });
        logger_config_1.logger.debug('SSE client connected', { broadcastId, userId });
        return true;
    }
    /**
     * Sends an error response and closes the connection.
     * Used when connection limits are reached.
     */
    sendErrorAndClose(res, statusCode, message) {
        if (!res.headersSent) {
            res.status(statusCode).json({
                success: false,
                error: {
                    code: 'CONNECTION_LIMIT_EXCEEDED',
                    message,
                },
            });
        }
    }
    /**
     * Removes an SSE client from the broadcast subscription.
     *
     * Cleans up heartbeat interval, removes client from tracking,
     * and decrements user connection count.
     *
     * @param broadcastId - The broadcast ID the client was subscribed to
     * @param client - The SSE client to remove
     */
    removeClient(broadcastId, client) {
        clearInterval(client.heartbeatInterval);
        const clientSet = this.clients.get(broadcastId);
        if (clientSet) {
            clientSet.delete(client);
            // Clean up empty sets
            if (clientSet.size === 0) {
                this.clients.delete(broadcastId);
            }
        }
        // Decrement user connection count
        const currentCount = this.userConnections.get(client.userId) ?? 0;
        if (currentCount <= 1) {
            this.userConnections.delete(client.userId);
        }
        else {
            this.userConnections.set(client.userId, currentCount - 1);
        }
    }
    /**
     * Emits a progress update to all clients watching a specific broadcast.
     *
     * Automatically determines the event type based on the broadcast status
     * and sends appropriate events to all connected clients.
     *
     * @param event - The broadcast progress event to emit
     */
    emitProgress(event) {
        const { broadcastId, status } = event;
        // Emit to the EventEmitter for any connected clients
        this.emitter.emit(`progress:${broadcastId}`, event);
        // Send status change event if applicable
        const clientSet = this.clients.get(broadcastId);
        if (clientSet) {
            for (const client of clientSet) {
                // Send status event
                this.sendEvent(client.res, 'status', { status });
                // Send completed event if broadcast is finished
                if (status === enums_1.BroadcastStatus.COMPLETED) {
                    this.sendEvent(client.res, 'completed', event);
                }
            }
        }
        logger_config_1.logger.debug('SSE progress emitted', {
            broadcastId,
            status,
            clientCount: clientSet?.size || 0,
        });
    }
    /**
     * Sends a heartbeat event to keep the SSE connection alive.
     *
     * Heartbeats are sent as comments to avoid being parsed as events by clients
     * but still maintain the connection.
     *
     * @param res - Express Response object for the SSE connection
     */
    sendHeartbeat(res) {
        if (!res.writableEnded) {
            // Send heartbeat as an event with timestamp
            this.sendEvent(res, 'heartbeat', { timestamp: new Date().toISOString() });
        }
    }
    /**
     * Sends an SSE event to a specific client.
     *
     * Formats the event according to SSE specification with event type and JSON data.
     *
     * @param res - Express Response object for the SSE connection
     * @param eventType - Type of SSE event (progress, status, completed, heartbeat)
     * @param data - Event data to send (will be JSON serialized)
     */
    sendEvent(res, eventType, data) {
        if (!res.writableEnded) {
            res.write(`event: ${eventType}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    }
    /**
     * Sends the initial state of a broadcast to a newly connected client.
     *
     * Called immediately after a client connects to provide current state
     * before any progress updates arrive.
     *
     * @param res - Express Response object for the SSE connection
     * @param event - Current broadcast state
     */
    sendInitialState(res, event) {
        this.sendEvent(res, 'progress', event);
        this.sendEvent(res, 'status', { status: event.status });
    }
    /**
     * Gets the count of connected clients for a specific broadcast.
     *
     * Useful for monitoring and debugging SSE connections.
     *
     * @param broadcastId - The broadcast ID to check
     * @returns Number of connected clients
     */
    getClientCount(broadcastId) {
        return this.clients.get(broadcastId)?.size || 0;
    }
    /**
     * Closes all SSE connections for a specific broadcast.
     *
     * Used when a broadcast is completed or cancelled to clean up resources.
     *
     * @param broadcastId - The broadcast ID to close connections for
     */
    closeAllConnections(broadcastId) {
        const clientSet = this.clients.get(broadcastId);
        if (clientSet) {
            for (const client of clientSet) {
                clearInterval(client.heartbeatInterval);
                if (!client.res.writableEnded) {
                    client.res.end();
                }
            }
            this.clients.delete(broadcastId);
            this.emitter.removeAllListeners(`progress:${broadcastId}`);
            logger_config_1.logger.debug('All SSE connections closed', { broadcastId });
        }
    }
};
exports.BroadcastSseService = BroadcastSseService;
exports.BroadcastSseService = BroadcastSseService = BroadcastSseService_1 = __decorate([
    (0, tsyringe_1.singleton)(),
    __metadata("design:paramtypes", [])
], BroadcastSseService);
