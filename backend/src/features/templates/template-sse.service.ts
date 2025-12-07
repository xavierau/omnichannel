import { singleton } from 'tsyringe';
import { Response } from 'express';
import { EventEmitter } from 'events';
import { logger } from '../../config/logger.config';

/**
 * SSE event types for template real-time updates.
 */
export type TemplateSseEventType =
  | 'template:status:changed'
  | 'template:sync:completed'
  | 'heartbeat'
  | 'error';

/**
 * Internal structure for tracking SSE clients in the template feature.
 */
interface TemplateSseClient {
  res: Response;
  heartbeatInterval: NodeJS.Timeout;
  userId: string;
  tenantId: string;
}

/**
 * Service for managing Server-Sent Events (SSE) connections for template real-time updates.
 *
 * Provides real-time notifications to connected users about:
 * - Template status changes (approved, rejected, disabled, etc.)
 * - Template sync completion events
 *
 * @remarks
 * - Uses Node.js EventEmitter for internal pub/sub
 * - Maintains heartbeat connections to keep SSE alive
 * - Handles client cleanup on disconnect
 * - Enforces connection limits per tenant and per user
 * - Clients are organized by tenantId for efficient broadcasting
 */
@singleton()
export class TemplateSseService {
  private readonly emitter = new EventEmitter();
  private readonly clients = new Map<string, Set<TemplateSseClient>>();
  private readonly userConnections = new Map<string, number>();

  /**
   * Heartbeat interval in milliseconds.
   * Sends a heartbeat every 30 seconds to keep the connection alive.
   */
  private static readonly HEARTBEAT_INTERVAL_MS = 30000;

  /**
   * Maximum listeners per event to prevent memory leaks.
   */
  private static readonly MAX_LISTENERS = 200;

  /**
   * Maximum SSE connections allowed per tenant.
   * Prevents resource exhaustion from too many clients on one tenant.
   */
  private static readonly MAX_CONNECTIONS_PER_TENANT = 100;

  /**
   * Maximum SSE connections allowed per user across all tenants.
   * Prevents a single user from consuming too many server resources.
   */
  private static readonly MAX_CONNECTIONS_PER_USER = 5;

  constructor() {
    this.emitter.setMaxListeners(TemplateSseService.MAX_LISTENERS);
  }

  /**
   * Adds an SSE client for real-time template updates.
   *
   * Sets up the SSE connection with proper headers and registers
   * the client for receiving template events.
   *
   * @param tenantId - The tenant ID for multi-tenancy isolation
   * @param userId - The user ID for connection tracking
   * @param res - Express Response object for the SSE connection
   * @returns true if connection was established, false if rejected due to limits
   */
  addClient(tenantId: string, userId: string, res: Response): boolean {
    // Check per-tenant connection limit
    const tenantClientCount = this.clients.get(tenantId)?.size ?? 0;
    if (tenantClientCount >= TemplateSseService.MAX_CONNECTIONS_PER_TENANT) {
      this.sendErrorAndClose(res, 503, 'Too many connections for this tenant');
      logger.warn('Template SSE connection rejected: tenant limit reached', {
        tenantId,
        currentCount: tenantClientCount,
        limit: TemplateSseService.MAX_CONNECTIONS_PER_TENANT,
      });
      return false;
    }

    // Check per-user connection limit
    const userConnectionCount = this.userConnections.get(userId) ?? 0;
    if (userConnectionCount >= TemplateSseService.MAX_CONNECTIONS_PER_USER) {
      this.sendErrorAndClose(res, 503, 'Too many SSE connections for this user');
      logger.warn('Template SSE connection rejected: user limit reached', {
        userId,
        currentCount: userConnectionCount,
        limit: TemplateSseService.MAX_CONNECTIONS_PER_USER,
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
    }, TemplateSseService.HEARTBEAT_INTERVAL_MS);

    // Create client entry
    const client: TemplateSseClient = {
      res,
      heartbeatInterval,
      userId,
      tenantId,
    };

    // Register client for this tenant
    if (!this.clients.has(tenantId)) {
      this.clients.set(tenantId, new Set());
    }
    this.clients.get(tenantId)!.add(client);

    // Track user connection count
    this.userConnections.set(userId, userConnectionCount + 1);

    // Handle client disconnect
    res.on('close', () => {
      this.removeClient(tenantId, client);
      logger.debug('Template SSE client disconnected', { tenantId, userId });
    });

    logger.debug('Template SSE client connected', { tenantId, userId });
    return true;
  }

  /**
   * Removes an SSE client from the tenant subscription.
   *
   * Cleans up heartbeat interval, removes client from tracking,
   * and decrements user connection count.
   *
   * @param tenantId - The tenant ID the client was subscribed to
   * @param client - The SSE client to remove
   */
  private removeClient(tenantId: string, client: TemplateSseClient): void {
    clearInterval(client.heartbeatInterval);

    const clientSet = this.clients.get(tenantId);
    if (clientSet) {
      clientSet.delete(client);

      // Clean up empty sets
      if (clientSet.size === 0) {
        this.clients.delete(tenantId);
      }
    }

    // Decrement user connection count
    const currentCount = this.userConnections.get(client.userId) ?? 0;
    if (currentCount <= 1) {
      this.userConnections.delete(client.userId);
    } else {
      this.userConnections.set(client.userId, currentCount - 1);
    }
  }

  /**
   * Emits an event to all clients of a specific tenant.
   *
   * @param tenantId - The tenant ID to broadcast to
   * @param eventType - Type of SSE event
   * @param data - Event data to send (will be JSON serialized)
   */
  emitToTenant(tenantId: string, eventType: TemplateSseEventType, data: unknown): void {
    const clientSet = this.clients.get(tenantId);
    if (!clientSet) {
      return;
    }

    for (const client of clientSet) {
      this.sendEvent(client.res, eventType, data);
    }

    logger.debug('Template SSE event emitted', {
      tenantId,
      eventType,
      clientCount: clientSet.size,
    });
  }

  /**
   * Emits a template status change event to all clients of a tenant.
   *
   * @param tenantId - The tenant ID to broadcast to
   * @param templateName - Name of the template
   * @param language - Language code of the template translation
   * @param oldStatus - Previous status (may be null for unknown)
   * @param newStatus - New status from webhook
   * @param reason - Optional reason for status change (e.g., rejection reason)
   */
  emitTemplateStatusChange(
    tenantId: string,
    templateName: string,
    language: string,
    oldStatus: string | null,
    newStatus: string,
    reason?: string
  ): void {
    const eventData = {
      templateName,
      language,
      oldStatus,
      newStatus,
      reason,
      timestamp: new Date().toISOString(),
    };
    this.emitToTenant(tenantId, 'template:status:changed', eventData);

    logger.info('Template status change SSE event emitted', {
      tenantId,
      templateName,
      language,
      oldStatus,
      newStatus,
    });
  }

  /**
   * Emits a template sync completed event to all clients of a tenant.
   *
   * @param tenantId - The tenant ID to broadcast to
   * @param syncedCount - Number of templates synced
   * @param channelAccountId - Optional channel account ID if sync was for specific account
   */
  emitSyncCompleted(
    tenantId: string,
    syncedCount: number,
    channelAccountId?: string
  ): void {
    const eventData = {
      syncedCount,
      channelAccountId,
      timestamp: new Date().toISOString(),
    };
    this.emitToTenant(tenantId, 'template:sync:completed', eventData);

    logger.info('Template sync completed SSE event emitted', {
      tenantId,
      syncedCount,
      channelAccountId,
    });
  }

  /**
   * Sends a heartbeat event to keep the SSE connection alive.
   *
   * @param res - Express Response object for the SSE connection
   */
  private sendHeartbeat(res: Response): void {
    if (!res.writableEnded) {
      this.sendEvent(res, 'heartbeat', { timestamp: new Date().toISOString() });
    }
  }

  /**
   * Sends an SSE event to a specific client.
   *
   * Formats the event according to SSE specification with event type and JSON data.
   *
   * @param res - Express Response object for the SSE connection
   * @param eventType - Type of SSE event
   * @param data - Event data to send (will be JSON serialized)
   */
  private sendEvent(res: Response, eventType: string, data: unknown): void {
    if (!res.writableEnded) {
      res.write(`event: ${eventType}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  }

  /**
   * Sends an error response and closes the connection.
   * Used when connection limits are reached.
   *
   * @param res - Express Response object
   * @param statusCode - HTTP status code to send
   * @param message - Error message
   */
  sendErrorAndClose(res: Response, statusCode: number, message: string): void {
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
   * Gets the count of connected clients for a specific tenant.
   *
   * Useful for monitoring and debugging SSE connections.
   *
   * @param tenantId - The tenant ID to check
   * @returns Number of connected clients
   */
  getClientCount(tenantId: string): number {
    return this.clients.get(tenantId)?.size ?? 0;
  }

  /**
   * Closes all SSE connections for a specific tenant.
   *
   * Used when tenant access is revoked or for maintenance purposes.
   *
   * @param tenantId - The tenant ID to close connections for
   */
  closeAllConnections(tenantId: string): void {
    const clientSet = this.clients.get(tenantId);
    if (clientSet) {
      for (const client of clientSet) {
        clearInterval(client.heartbeatInterval);
        if (!client.res.writableEnded) {
          client.res.end();
        }

        // Decrement user connection count
        const currentCount = this.userConnections.get(client.userId) ?? 0;
        if (currentCount <= 1) {
          this.userConnections.delete(client.userId);
        } else {
          this.userConnections.set(client.userId, currentCount - 1);
        }
      }
      this.clients.delete(tenantId);

      logger.debug('All template SSE connections closed', { tenantId });
    }
  }
}
