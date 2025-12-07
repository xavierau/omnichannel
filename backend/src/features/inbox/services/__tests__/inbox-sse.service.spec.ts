import 'reflect-metadata';
import { Response } from 'express';
import { InboxSseService, InboxSseEventType } from '../inbox-sse.service';

// Mock the logger to avoid console output during tests
jest.mock('../../../../config/logger.config', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('InboxSseService', () => {
  let service: InboxSseService;

  const tenantId = 'tenant-123';
  const userId = 'user-456';
  const conversationId = 'conv-789';

  /**
   * Creates a mock Express Response object for SSE testing.
   */
  const createMockResponse = (): jest.Mocked<Response> & {
    writtenData: string[];
    headers: Record<string, string>;
    statusCodeValue: number;
    endedWith: unknown;
  } => {
    const writtenData: string[] = [];
    const headers: Record<string, string> = {};
    let statusCodeValue = 200;
    let endedWith: unknown;
    let writableEnded = false;
    let headersSent = false;

    const res = {
      writtenData,
      headers,
      statusCodeValue,
      endedWith,
      setHeader: jest.fn((key: string, value: string) => {
        headers[key] = value;
        return res;
      }),
      flushHeaders: jest.fn(() => {
        headersSent = true;
      }),
      write: jest.fn((data: string) => {
        if (!writableEnded) {
          writtenData.push(data);
        }
        return true;
      }),
      end: jest.fn((data?: unknown) => {
        writableEnded = true;
        endedWith = data;
      }),
      status: jest.fn((code: number) => {
        statusCodeValue = code;
        return res;
      }),
      json: jest.fn((data: unknown) => {
        endedWith = data;
        return res;
      }),
      on: jest.fn(),
      get writableEnded() {
        return writableEnded;
      },
      get headersSent() {
        return headersSent;
      },
    } as unknown as jest.Mocked<Response> & {
      writtenData: string[];
      headers: Record<string, string>;
      statusCodeValue: number;
      endedWith: unknown;
    };

    return res;
  };

  /**
   * Simulates a client disconnect by triggering the 'close' event callback.
   */
  const simulateDisconnect = (res: jest.Mocked<Response>): void => {
    const onCall = (res.on as jest.Mock).mock.calls.find(
      (call) => call[0] === 'close'
    );
    if (onCall && onCall[1]) {
      onCall[1]();
    }
  };

  beforeEach(() => {
    jest.useFakeTimers();
    service = new InboxSseService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('addClient', () => {
    it('should set correct SSE headers', () => {
      const res = createMockResponse();

      const result = service.addClient(tenantId, userId, res);

      expect(result).toBe(true);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(res.setHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no');
      expect(res.flushHeaders).toHaveBeenCalled();
    });

    it('should track client by tenantId', () => {
      const res = createMockResponse();

      service.addClient(tenantId, userId, res);

      expect(service.getClientCount(tenantId)).toBe(1);
    });

    it('should allow multiple clients per tenant', () => {
      const res1 = createMockResponse();
      const res2 = createMockResponse();

      service.addClient(tenantId, 'user-1', res1);
      service.addClient(tenantId, 'user-2', res2);

      expect(service.getClientCount(tenantId)).toBe(2);
    });

    it('should setup heartbeat interval', () => {
      const res = createMockResponse();

      service.addClient(tenantId, userId, res);

      // Advance time to trigger heartbeat (30 seconds)
      jest.advanceTimersByTime(30000);

      // Should have written a heartbeat event
      const heartbeatWritten = res.writtenData.some(
        (data) => data.includes('event: heartbeat')
      );
      expect(heartbeatWritten).toBe(true);
    });

    it('should return false when tenant connection limit is exceeded', () => {
      // Add MAX_CONNECTIONS_PER_TENANT clients
      for (let i = 0; i < 100; i++) {
        const res = createMockResponse();
        service.addClient(tenantId, `user-${i}`, res);
      }

      expect(service.getClientCount(tenantId)).toBe(100);

      // Try to add one more
      const extraRes = createMockResponse();
      const result = service.addClient(tenantId, 'extra-user', extraRes);

      expect(result).toBe(false);
      expect(service.getClientCount(tenantId)).toBe(100);
    });

    it('should return false when per-user connection limit is exceeded', () => {
      // Add MAX_CONNECTIONS_PER_USER clients for same user
      for (let i = 0; i < 5; i++) {
        const res = createMockResponse();
        service.addClient(tenantId, userId, res);
      }

      // Try to add one more for same user
      const extraRes = createMockResponse();
      const result = service.addClient(tenantId, userId, extraRes);

      expect(result).toBe(false);
    });

    it('should setup disconnect handler', () => {
      const res = createMockResponse();

      service.addClient(tenantId, userId, res);

      expect(res.on).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });

  describe('removeClient', () => {
    it('should remove client on disconnect', () => {
      const res = createMockResponse();
      service.addClient(tenantId, userId, res);

      expect(service.getClientCount(tenantId)).toBe(1);

      // Simulate disconnect
      simulateDisconnect(res);

      expect(service.getClientCount(tenantId)).toBe(0);
    });

    it('should decrement user connection count on disconnect', () => {
      const res1 = createMockResponse();
      const res2 = createMockResponse();

      service.addClient(tenantId, userId, res1);
      service.addClient(tenantId, userId, res2);

      // User can now add more connections after one disconnects
      simulateDisconnect(res1);

      // Should be able to add another connection
      const res3 = createMockResponse();
      const result = service.addClient(tenantId, userId, res3);
      expect(result).toBe(true);
    });

    it('should clear heartbeat interval on disconnect', () => {
      const res = createMockResponse();
      service.addClient(tenantId, userId, res);

      // Simulate disconnect
      simulateDisconnect(res);

      // Advance time - should NOT write heartbeat since interval was cleared
      const dataLengthAfterDisconnect = res.writtenData.length;
      jest.advanceTimersByTime(60000);

      expect(res.writtenData.length).toBe(dataLengthAfterDisconnect);
    });
  });

  describe('emitToTenant', () => {
    it('should send event to all clients of a tenant', () => {
      const res1 = createMockResponse();
      const res2 = createMockResponse();

      service.addClient(tenantId, 'user-1', res1);
      service.addClient(tenantId, 'user-2', res2);

      const eventData = { conversationId, message: 'test' };
      service.emitToTenant(tenantId, 'conversation:new', eventData);

      expect(res1.write).toHaveBeenCalledWith('event: conversation:new\n');
      expect(res1.write).toHaveBeenCalledWith(`data: ${JSON.stringify(eventData)}\n\n`);
      expect(res2.write).toHaveBeenCalledWith('event: conversation:new\n');
      expect(res2.write).toHaveBeenCalledWith(`data: ${JSON.stringify(eventData)}\n\n`);
    });

    it('should not send to clients of different tenant', () => {
      const res1 = createMockResponse();
      const res2 = createMockResponse();

      service.addClient(tenantId, 'user-1', res1);
      service.addClient('other-tenant', 'user-2', res2);

      service.emitToTenant(tenantId, 'conversation:new', { test: true });

      // res1 should receive event (same tenant)
      expect(res1.write).toHaveBeenCalled();
      // res2 should NOT receive event (different tenant)
      expect(res2.write).not.toHaveBeenCalled();
    });

    it('should handle non-existent tenant gracefully', () => {
      // Should not throw
      expect(() => {
        service.emitToTenant('non-existent-tenant', 'conversation:new', {});
      }).not.toThrow();
    });

    it('should not write to ended connections', () => {
      const res = createMockResponse();
      service.addClient(tenantId, userId, res);

      // End the connection
      res.end();

      // Clear mock calls to check only new writes
      (res.write as jest.Mock).mockClear();

      service.emitToTenant(tenantId, 'conversation:new', {});

      // Should not attempt to write
      expect(res.write).not.toHaveBeenCalled();
    });
  });

  describe('emitConversationEvent', () => {
    it('should include conversationId in event data', () => {
      const res = createMockResponse();
      service.addClient(tenantId, userId, res);

      const eventData = { message: 'Hello' };
      service.emitConversationEvent(tenantId, conversationId, 'conversation:message:new', eventData);

      const writeCall = (res.write as jest.Mock).mock.calls.find(
        (call) => call[0].includes('data:')
      );
      expect(writeCall).toBeDefined();

      const writtenData = JSON.parse(writeCall[0].replace('data: ', '').replace('\n\n', ''));
      expect(writtenData.conversationId).toBe(conversationId);
      expect(writtenData.message).toBe('Hello');
    });
  });

  describe('sendHeartbeat', () => {
    it('should send heartbeat with timestamp', () => {
      const res = createMockResponse();
      service.addClient(tenantId, userId, res);

      // Clear initial writes
      (res.write as jest.Mock).mockClear();

      // Trigger heartbeat
      jest.advanceTimersByTime(30000);

      expect(res.write).toHaveBeenCalledWith('event: heartbeat\n');
      const dataCall = (res.write as jest.Mock).mock.calls.find(
        (call) => call[0].includes('data:') && call[0].includes('timestamp')
      );
      expect(dataCall).toBeDefined();
    });

    it('should not write heartbeat to ended connection', () => {
      const res = createMockResponse();
      service.addClient(tenantId, userId, res);

      // End the connection
      res.end();

      // Clear mock calls
      (res.write as jest.Mock).mockClear();

      // Trigger heartbeat
      jest.advanceTimersByTime(30000);

      expect(res.write).not.toHaveBeenCalled();
    });
  });

  describe('sendErrorAndClose', () => {
    it('should send JSON error response when headers not sent', () => {
      const res = createMockResponse();

      // Access internal method for testing via type assertion
      (service as unknown as { sendErrorAndClose: (res: Response, code: number, msg: string) => void })
        .sendErrorAndClose(res, 503, 'Test error');

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CONNECTION_LIMIT_EXCEEDED',
          message: 'Test error',
        },
      });
    });

    it('should not send response when headers already sent', () => {
      const res = createMockResponse();
      res.flushHeaders(); // Mark headers as sent

      (service as unknown as { sendErrorAndClose: (res: Response, code: number, msg: string) => void })
        .sendErrorAndClose(res, 503, 'Test error');

      // Should not call status/json when headers already sent
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('getClientCount', () => {
    it('should return 0 for tenant with no clients', () => {
      expect(service.getClientCount('non-existent')).toBe(0);
    });

    it('should return accurate count', () => {
      const res1 = createMockResponse();
      const res2 = createMockResponse();
      const res3 = createMockResponse();

      service.addClient(tenantId, 'user-1', res1);
      service.addClient(tenantId, 'user-2', res2);
      service.addClient(tenantId, 'user-3', res3);

      expect(service.getClientCount(tenantId)).toBe(3);

      // Disconnect one
      simulateDisconnect(res2);

      expect(service.getClientCount(tenantId)).toBe(2);
    });
  });

  describe('closeAllConnections', () => {
    it('should close all connections for a tenant', () => {
      const res1 = createMockResponse();
      const res2 = createMockResponse();

      service.addClient(tenantId, 'user-1', res1);
      service.addClient(tenantId, 'user-2', res2);

      service.closeAllConnections(tenantId);

      expect(res1.end).toHaveBeenCalled();
      expect(res2.end).toHaveBeenCalled();
      expect(service.getClientCount(tenantId)).toBe(0);
    });

    it('should not affect other tenants', () => {
      const res1 = createMockResponse();
      const res2 = createMockResponse();

      service.addClient(tenantId, 'user-1', res1);
      service.addClient('other-tenant', 'user-2', res2);

      service.closeAllConnections(tenantId);

      expect(res1.end).toHaveBeenCalled();
      expect(res2.end).not.toHaveBeenCalled();
      expect(service.getClientCount('other-tenant')).toBe(1);
    });

    it('should clear heartbeat intervals', () => {
      const res = createMockResponse();
      service.addClient(tenantId, userId, res);

      service.closeAllConnections(tenantId);

      // Advance time - should NOT trigger heartbeat
      const dataLength = res.writtenData.length;
      jest.advanceTimersByTime(60000);

      // Only the initial writes should exist, no new heartbeats
      // (may have written initial data, but no NEW writes after close)
      // Since end() was called, writableEnded becomes true
      expect(res.writableEnded).toBe(true);
    });

    it('should handle non-existent tenant gracefully', () => {
      expect(() => {
        service.closeAllConnections('non-existent');
      }).not.toThrow();
    });
  });

  describe('event types', () => {
    const eventTypes: InboxSseEventType[] = [
      'conversation:new',
      'conversation:message:new',
      'conversation:message:status',
      'conversation:assigned',
      'conversation:status:changed',
      'conversation:unread:updated',
      'note:created',
      'note:updated',
      'note:deleted',
      'heartbeat',
      'error',
    ];

    eventTypes.forEach((eventType) => {
      it(`should emit ${eventType} event correctly`, () => {
        const res = createMockResponse();
        service.addClient(tenantId, userId, res);

        // Clear initial writes
        (res.write as jest.Mock).mockClear();

        service.emitToTenant(tenantId, eventType, { test: true });

        expect(res.write).toHaveBeenCalledWith(`event: ${eventType}\n`);
      });
    });
  });

  describe('concurrency and edge cases', () => {
    it('should handle rapid connect/disconnect cycles', () => {
      for (let i = 0; i < 50; i++) {
        const res = createMockResponse();
        service.addClient(tenantId, `user-${i}`, res);
        simulateDisconnect(res);
      }

      expect(service.getClientCount(tenantId)).toBe(0);
    });

    it('should handle multiple tenants simultaneously', () => {
      const tenant1Res = createMockResponse();
      const tenant2Res = createMockResponse();
      const tenant3Res = createMockResponse();

      service.addClient('tenant-1', 'user-1', tenant1Res);
      service.addClient('tenant-2', 'user-2', tenant2Res);
      service.addClient('tenant-3', 'user-3', tenant3Res);

      expect(service.getClientCount('tenant-1')).toBe(1);
      expect(service.getClientCount('tenant-2')).toBe(1);
      expect(service.getClientCount('tenant-3')).toBe(1);

      // Emit to one tenant should not affect others
      (tenant1Res.write as jest.Mock).mockClear();
      (tenant2Res.write as jest.Mock).mockClear();
      (tenant3Res.write as jest.Mock).mockClear();

      service.emitToTenant('tenant-2', 'conversation:new', {});

      expect(tenant1Res.write).not.toHaveBeenCalled();
      expect(tenant2Res.write).toHaveBeenCalled();
      expect(tenant3Res.write).not.toHaveBeenCalled();
    });

    it('should clean up empty tenant sets', () => {
      const res = createMockResponse();
      service.addClient(tenantId, userId, res);

      expect(service.getClientCount(tenantId)).toBe(1);

      simulateDisconnect(res);

      // Internal clients map should be cleaned up
      // We verify this by checking count is 0 (implementation detail)
      expect(service.getClientCount(tenantId)).toBe(0);
    });
  });
});
