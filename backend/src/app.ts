import express, { Application, Request, Response, NextFunction } from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from '@middleware/error-handler';
import { requestContextMiddleware } from '@middleware/request-context';
import { generalLimiter } from '@middleware/rate-limiter';
import { configurePassport } from '@config/passport.config';
import authRoutes from '@features/auth/auth.routes';
import userRoutes from '@features/users/user.routes';
import roleRoutes from '@features/roles/role.routes';
import permissionRoutes from '@features/permissions/permission.routes';
import customerRoutes from '@features/customers/customer.routes';
import tagRoutes from '@features/tags/tag.routes';
import broadcastRoutes from '@features/broadcasts/broadcast.routes';
import templateRoutes from '@features/templates/template.routes';
import groupRoutes from '@features/groups/group.routes';
import mediaRoutes from '@features/media/media.routes';
import { createChannelAccountRoutes } from '@features/channel-accounts/channel-account.routes';
import { createWebhookRoutes } from '@features/webhooks/webhook.routes';
import teamRoutes from '@features/teams/team.routes';
import inboxRoutes from '@features/inbox/inbox.routes';
import { createHealthRoutes } from '@features/health/health.routes';
import { createCustomFieldRoutes } from '@features/custom-fields/custom-field.routes';
import { createInvitationRoutes } from '@features/invitations/invitation.routes';

/**
 * Creates and configures the Express application
 *
 * Security Features:
 * - Helmet: Security headers (CSP, X-Frame-Options, etc.)
 * - CORS: Cross-Origin Resource Sharing with credentials
 * - Rate Limiting: Global and per-route limits
 * - CSRF Protection: Double-submit cookie pattern for state-changing routes
 *
 * CSRF Protection Notes:
 * - CSRF tokens are obtained via GET /api/auth/csrf-token
 * - Tokens must be included in X-CSRF-Token header for POST/PUT/PATCH/DELETE
 * - Login and Register routes are exempt (no existing session)
 * - See auth.routes.ts and user.routes.ts for protected routes
 */
export function createApp(): Application {
  const app = express();

  // Request context middleware (must be first to attach correlation ID)
  app.use(requestContextMiddleware);

  // Security headers with SPA-friendly CSP in production
  const isProduction = process.env.NODE_ENV === 'production';
  app.use(helmet({
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Required for some CSS-in-JS libraries
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'", process.env.FRONTEND_URL || "https://my-app.com"],
        mediaSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    } : false, // Disable CSP in development for easier debugging
  }));

  // CORS configuration
  // credentials: true is required for CSRF cookies to work cross-origin
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true, // Allow cookies (required for CSRF and refresh tokens)
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
      exposedHeaders: ['X-CSRF-Token'],
    })
  );

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Cookie parser for httpOnly refresh tokens and CSRF tokens
  app.use(cookieParser());

  // Configure Passport
  const passport = configurePassport();
  app.use(passport.initialize());

  // Global rate limiting
  app.use(generalLimiter);

  // Health check routes (no auth required, before other routes)
  // Provides /health, /health/live, /health/ready endpoints
  app.use('/health', createHealthRoutes());

  // Webhook routes (must be before json body parser for raw body access)
  // These routes handle provider callbacks and have their own body parsing
  app.use('/webhooks', createWebhookRoutes());

  // API routes
  // Note: CSRF protection is applied at route level, not globally
  // This allows exempting login/register routes while protecting others
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/roles', roleRoutes);
  app.use('/api/permissions', permissionRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/tags', tagRoutes);
  app.use('/api/broadcasts', broadcastRoutes);
  app.use('/api/templates', templateRoutes);
  app.use('/api/groups', groupRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/channel-accounts', createChannelAccountRoutes());
  app.use('/api/teams', teamRoutes);
  app.use('/api/inbox', inboxRoutes);
  app.use('/api/custom-fields', createCustomFieldRoutes());
  app.use('/api/invitations', createInvitationRoutes());

  // Serve static files in production (frontend build)
  if (process.env.NODE_ENV === 'production') {
    const publicPath = path.join(__dirname, '..', 'public');

    // Serve static assets with caching
    app.use(express.static(publicPath, {
      maxAge: '1d',
      etag: true,
    }));

    // SPA fallback: serve index.html for all non-API routes
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      // Skip API routes and health checks
      if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/webhooks')) {
        return next();
      }
      res.sendFile(path.join(publicPath, 'index.html'));
    });
  }

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
