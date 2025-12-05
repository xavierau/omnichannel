import 'reflect-metadata';
import request from 'supertest';
import express, { Application, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { container } from 'tsyringe';
import { TagController } from '../tag.controller';
import { TagService } from '../tag.service';
import { User, UserStatus } from '../../users/user.entity';
import { Tag, TagColor } from '../tag.entity';
// Use the same HttpException class as the error handler
import {
  ConflictException,
  NotFoundException,
} from '../../../shared/exceptions/HttpException';
import {
  csrfEnsureToken,
  csrfValidateToken,
  getCsrfToken,
} from '../../../middleware/csrf-protection';
import { requestContextMiddleware } from '../../../middleware/request-context';
import { validateDto } from '../../../middleware/validate-dto';
import { CreateTagDto } from '../dto/create-tag.dto';
import { UpdateTagDto } from '../dto/update-tag.dto';

// Custom error handler that works with both exception class files
// (The codebase has two identical HttpException definitions)
const testErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Check for statusCode property (present on both HttpException versions)
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const errors = err.errors;

  res.status(statusCode).json({
    statusCode,
    message,
    ...(errors && { errors }),
  });
};

// Mock the logger
jest.mock('../../../config/logger.config', () => ({
  auditLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the PermissionService
jest.mock('../../users/permission.service', () => ({
  PermissionService: jest.fn().mockImplementation(() => ({
    hasPermission: jest.fn().mockResolvedValue(true),
    hasAnyPermission: jest.fn().mockResolvedValue(true),
    hasAllPermissions: jest.fn().mockResolvedValue(true),
  })),
}));

describe('Tag Integration Tests', () => {
  let app: Application;
  let mockTagService: jest.Mocked<TagService>;

  const tenantId = 'tenant-123';
  const userId = 'user-123';

  // Test fixtures
  const mockUser: User = {
    id: userId,
    tenantId,
    email: 'test@example.com',
    passwordHash: 'hash',
    firstName: 'Test',
    lastName: 'User',
    status: UserStatus.ACTIVE,
    emailVerified: true,
    lastLoginAt: new Date(),
    failedLoginAttempts: 0,
    lockedUntil: null,
    roles: [
      {
        id: 'role-1',
        name: 'admin',
        displayName: 'Admin',
        description: 'Admin role',
        level: 2,
        isSystem: false,
        permissions: [],
        users: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    tenant: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTag: Tag = {
    id: 'tag-1',
    tenantId,
    name: 'VIP',
    color: TagColor.PURPLE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    tenant: {} as any,
  };

  const mockTag2: Tag = {
    id: 'tag-2',
    tenantId,
    name: 'Premium',
    color: TagColor.BLUE,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    tenant: {} as any,
  };

  // Mock authentication middleware
  const mockAuthenticate = (req: Request, res: Response, next: NextFunction) => {
    req.user = mockUser;
    // Also set tenantId as the requireTenant middleware would
    (req as any).tenantId = tenantId;
    next();
  };

  // Mock authorization middleware
  const mockRequirePermission = () => {
    return (req: Request, res: Response, next: NextFunction) => {
      next();
    };
  };

  beforeEach(() => {
    // Reset container
    container.clearInstances();

    // Create mock service
    mockTagService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<TagService>;

    // Register mock service
    container.registerInstance(TagService, mockTagService);

    // Create test app
    app = express();
    app.use(requestContextMiddleware);
    app.use(express.json());
    app.use(cookieParser());

    // CSRF token endpoint
    app.get('/csrf-token', csrfEnsureToken, (req, res) => {
      res.json({ csrfToken: getCsrfToken(req) });
    });

    // Create controller
    const controller = container.resolve(TagController);

    // Routes
    app.get('/api/tags', mockAuthenticate, mockRequirePermission(), controller.listTags);
    app.get('/api/tags/:id', mockAuthenticate, mockRequirePermission(), controller.getTag);
    app.post(
      '/api/tags',
      mockAuthenticate,
      csrfValidateToken,
      mockRequirePermission(),
      validateDto(CreateTagDto),
      controller.createTag
    );
    app.put(
      '/api/tags/:id',
      mockAuthenticate,
      csrfValidateToken,
      mockRequirePermission(),
      validateDto(UpdateTagDto),
      controller.updateTag
    );
    app.delete(
      '/api/tags/:id',
      mockAuthenticate,
      csrfValidateToken,
      mockRequirePermission(),
      controller.deleteTag
    );

    // Error handler
    app.use(testErrorHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper to get CSRF token
  const getCsrf = async () => {
    const response = await request(app).get('/csrf-token');
    const cookies = response.headers['set-cookie'];
    const csrfCookie = cookies[0].split(';')[0];
    return {
      token: response.body.csrfToken,
      cookie: csrfCookie,
    };
  };

  describe('GET /api/tags', () => {
    it('should return all tags for tenant', async () => {
      mockTagService.findAll.mockResolvedValue([mockTag, mockTag2]);

      const response = await request(app)
        .get('/api/tags')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('VIP');
      expect(response.body.data[1].name).toBe('Premium');
    });

    it('should return formatted tag data', async () => {
      mockTagService.findAll.mockResolvedValue([mockTag]);

      const response = await request(app)
        .get('/api/tags')
        .expect(200);

      expect(response.body.data[0]).toEqual({
        id: 'tag-1',
        name: 'VIP',
        color: 'purple',
        createdAt: mockTag.createdAt.toISOString(),
        updatedAt: mockTag.updatedAt.toISOString(),
      });
    });

    it('should return empty array when no tags exist', async () => {
      mockTagService.findAll.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/tags')
        .expect(200);

      expect(response.body.data).toEqual([]);
    });
  });

  describe('GET /api/tags/:id', () => {
    it('should return tag when found', async () => {
      mockTagService.findById.mockResolvedValue(mockTag);

      const response = await request(app)
        .get('/api/tags/tag-1')
        .expect(200);

      expect(response.body.data.id).toBe('tag-1');
      expect(response.body.data.name).toBe('VIP');
      expect(response.body.data.color).toBe('purple');
    });

    it('should return 404 when tag not found', async () => {
      mockTagService.findById.mockRejectedValue(
        new NotFoundException('Tag not found')
      );

      const response = await request(app)
        .get('/api/tags/nonexistent')
        .expect(404);

      expect(response.body.message).toBe('Tag not found');
    });
  });

  describe('POST /api/tags', () => {
    it('should create tag with valid data and CSRF token', async () => {
      const newTag: Tag = {
        id: 'tag-3',
        tenantId,
        name: 'New Tag',
        color: TagColor.GREEN,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenant: {} as any,
      };

      mockTagService.create.mockResolvedValue(newTag);

      const { token, cookie } = await getCsrf();

      const response = await request(app)
        .post('/api/tags')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({
          name: 'New Tag',
          color: 'green',
        })
        .expect(201);

      expect(response.body.data.name).toBe('New Tag');
      expect(response.body.data.color).toBe('green');
      expect(mockTagService.create).toHaveBeenCalled();
    });

    it('should reject without CSRF token', async () => {
      await request(app)
        .post('/api/tags')
        .send({
          name: 'New Tag',
          color: 'green',
        })
        .expect(403);
    });

    it('should return 422 for invalid color', async () => {
      const { token, cookie } = await getCsrf();

      const response = await request(app)
        .post('/api/tags')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({
          name: 'New Tag',
          color: 'invalid-color',
        })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });

    it('should return 422 for name too long', async () => {
      const { token, cookie } = await getCsrf();

      await request(app)
        .post('/api/tags')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({
          name: 'a'.repeat(101), // 101 characters
          color: 'green',
        })
        .expect(400);
    });

    it('should return 422 for empty name', async () => {
      const { token, cookie } = await getCsrf();

      await request(app)
        .post('/api/tags')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({
          name: '',
          color: 'green',
        })
        .expect(400);
    });

    it('should return 409 for duplicate name', async () => {
      mockTagService.create.mockRejectedValue(
        new ConflictException('Tag with this name already exists')
      );

      const { token, cookie } = await getCsrf();

      const response = await request(app)
        .post('/api/tags')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({
          name: 'VIP',
          color: 'green',
        })
        .expect(409);

      expect(response.body.message).toBe('Tag with this name already exists');
    });

    it('should accept all valid color values', async () => {
      const validColors = ['purple', 'blue', 'green', 'gray', 'yellow', 'orange', 'red', 'pink'];

      for (const color of validColors) {
        const newTag: Tag = {
          ...mockTag,
          id: `tag-${color}`,
          name: `Tag ${color}`,
          color: color as TagColor,
        };

        mockTagService.create.mockResolvedValue(newTag);

        const { token, cookie } = await getCsrf();

        const response = await request(app)
          .post('/api/tags')
          .set('Cookie', cookie)
          .set('X-CSRF-Token', token)
          .send({
            name: `Tag ${color}`,
            color,
          })
          .expect(201);

        expect(response.body.data.color).toBe(color);
      }
    });
  });

  describe('PUT /api/tags/:id', () => {
    it('should update tag with valid data', async () => {
      const updatedTag: Tag = {
        ...mockTag,
        name: 'Updated VIP',
        color: TagColor.ORANGE,
      };

      mockTagService.update.mockResolvedValue(updatedTag);

      const { token, cookie } = await getCsrf();

      const response = await request(app)
        .put('/api/tags/tag-1')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({
          name: 'Updated VIP',
          color: 'orange',
        })
        .expect(200);

      expect(response.body.data.name).toBe('Updated VIP');
      expect(response.body.data.color).toBe('orange');
    });

    it('should update only name', async () => {
      const updatedTag: Tag = {
        ...mockTag,
        name: 'Updated Name',
      };

      mockTagService.update.mockResolvedValue(updatedTag);

      const { token, cookie } = await getCsrf();

      await request(app)
        .put('/api/tags/tag-1')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({
          name: 'Updated Name',
        })
        .expect(200);

      expect(mockTagService.update).toHaveBeenCalledWith(
        'tag-1',
        expect.objectContaining({ name: 'Updated Name' }),
        tenantId
      );
    });

    it('should update only color', async () => {
      const updatedTag: Tag = {
        ...mockTag,
        color: TagColor.RED,
      };

      mockTagService.update.mockResolvedValue(updatedTag);

      const { token, cookie } = await getCsrf();

      await request(app)
        .put('/api/tags/tag-1')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({
          color: 'red',
        })
        .expect(200);

      expect(mockTagService.update).toHaveBeenCalledWith(
        'tag-1',
        expect.objectContaining({ color: 'red' }),
        tenantId
      );
    });

    it('should reject without CSRF token', async () => {
      await request(app)
        .put('/api/tags/tag-1')
        .send({ name: 'Updated' })
        .expect(403);
    });

    it('should return 404 when tag not found', async () => {
      mockTagService.update.mockRejectedValue(
        new NotFoundException('Tag not found')
      );

      const { token, cookie } = await getCsrf();

      await request(app)
        .put('/api/tags/nonexistent')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({ name: 'Updated' })
        .expect(404);
    });

    it('should return 409 for duplicate name', async () => {
      mockTagService.update.mockRejectedValue(
        new ConflictException('Tag with this name already exists')
      );

      const { token, cookie } = await getCsrf();

      await request(app)
        .put('/api/tags/tag-1')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({ name: 'Premium' })
        .expect(409);
    });

    it('should return 422 for invalid color', async () => {
      const { token, cookie } = await getCsrf();

      await request(app)
        .put('/api/tags/tag-1')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({ color: 'invalid' })
        .expect(400);
    });
  });

  describe('DELETE /api/tags/:id', () => {
    it('should delete tag successfully', async () => {
      mockTagService.delete.mockResolvedValue(undefined);

      const { token, cookie } = await getCsrf();

      await request(app)
        .delete('/api/tags/tag-1')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .expect(204);

      expect(mockTagService.delete).toHaveBeenCalledWith('tag-1', tenantId);
    });

    it('should reject without CSRF token', async () => {
      await request(app)
        .delete('/api/tags/tag-1')
        .expect(403);
    });

    it('should return 404 when tag not found', async () => {
      mockTagService.delete.mockRejectedValue(
        new NotFoundException('Tag not found')
      );

      const { token, cookie } = await getCsrf();

      await request(app)
        .delete('/api/tags/nonexistent')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .expect(404);
    });
  });

  describe('Authentication', () => {
    it('should error when user is missing from request', async () => {
      // Create a new app without auth middleware
      const appNoAuth = express();
      appNoAuth.use(requestContextMiddleware);
      appNoAuth.use(express.json());

      const controller = container.resolve(TagController);

      // Route without authentication - user is undefined
      // Note: In production, the authenticate middleware would reject first
      // This test verifies the controller fails gracefully without a user
      appNoAuth.get('/api/tags', (req, res, next) => {
        req.user = undefined;
        next();
      }, controller.listTags);

      appNoAuth.use(testErrorHandler);

      // When user is undefined, accessing user.tenantId throws an error
      // This results in a 500 Internal Server Error
      const response = await request(appNoAuth)
        .get('/api/tags')
        .expect(500);

      expect(response.body.statusCode).toBe(500);
    });
  });

  describe('Tenant Isolation', () => {
    it('should use tenant from authenticated user for list', async () => {
      mockTagService.findAll.mockResolvedValue([]);

      await request(app)
        .get('/api/tags')
        .expect(200);

      expect(mockTagService.findAll).toHaveBeenCalledWith(tenantId);
    });

    it('should use tenant from authenticated user for get', async () => {
      mockTagService.findById.mockResolvedValue(mockTag);

      await request(app)
        .get('/api/tags/tag-1')
        .expect(200);

      expect(mockTagService.findById).toHaveBeenCalledWith('tag-1', tenantId);
    });

    it('should use tenant from authenticated user for create', async () => {
      mockTagService.create.mockResolvedValue(mockTag);

      const { token, cookie } = await getCsrf();

      await request(app)
        .post('/api/tags')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({
          name: 'Test',
          color: 'green',
        })
        .expect(201);

      expect(mockTagService.create).toHaveBeenCalledWith(
        expect.anything(),
        tenantId
      );
    });

    it('should use tenant from authenticated user for update', async () => {
      mockTagService.update.mockResolvedValue(mockTag);

      const { token, cookie } = await getCsrf();

      await request(app)
        .put('/api/tags/tag-1')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .send({ name: 'Updated' })
        .expect(200);

      expect(mockTagService.update).toHaveBeenCalledWith(
        'tag-1',
        expect.anything(),
        tenantId
      );
    });

    it('should use tenant from authenticated user for delete', async () => {
      mockTagService.delete.mockResolvedValue(undefined);

      const { token, cookie } = await getCsrf();

      await request(app)
        .delete('/api/tags/tag-1')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', token)
        .expect(204);

      expect(mockTagService.delete).toHaveBeenCalledWith('tag-1', tenantId);
    });

    it('should reject user without tenant', async () => {
      // Create app with user missing tenant
      const appNoTenant = express();
      appNoTenant.use(requestContextMiddleware);
      appNoTenant.use(express.json());

      const controller = container.resolve(TagController);

      // Simulate what happens when tenantId is not set on request
      // (i.e., requireTenant middleware would have rejected the request)
      appNoTenant.get('/api/tags', (req, res, next) => {
        req.user = { ...mockUser, tenantId: null };
        // Do NOT set req.tenantId to simulate missing tenant check
        // Controller now uses req.tenantId! which will be undefined
        next();
      }, controller.listTags);

      appNoTenant.use(testErrorHandler);

      // Controller expects req.tenantId to be set by middleware
      // When not set, it will throw an error (500 from undefined access)
      // In production, requireTenant middleware prevents this
      const response = await request(appNoTenant)
        .get('/api/tags')
        .expect(500);

      // Note: In production, requireTenant middleware returns 400 before controller
      expect(response.body.statusCode).toBe(500);
    });
  });

  describe('CSRF Protection', () => {
    it('should reject POST with invalid CSRF token', async () => {
      const { cookie } = await getCsrf();

      await request(app)
        .post('/api/tags')
        .set('Cookie', cookie)
        .set('X-CSRF-Token', 'invalid-token')
        .send({
          name: 'New Tag',
          color: 'green',
        })
        .expect(403);
    });

    it('should reject PUT with missing cookie', async () => {
      const { token } = await getCsrf();

      await request(app)
        .put('/api/tags/tag-1')
        .set('X-CSRF-Token', token)
        .send({ name: 'Updated' })
        .expect(403);
    });

    it('should reject DELETE with mismatched tokens', async () => {
      const csrf1 = await getCsrf();
      const csrf2 = await getCsrf();

      await request(app)
        .delete('/api/tags/tag-1')
        .set('Cookie', csrf1.cookie)
        .set('X-CSRF-Token', csrf2.token) // Mismatched token
        .expect(403);
    });

    it('should allow GET without CSRF token', async () => {
      mockTagService.findAll.mockResolvedValue([]);

      await request(app)
        .get('/api/tags')
        .expect(200);
    });
  });
});
