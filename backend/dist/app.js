"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const error_handler_1 = require("@middleware/error-handler");
const request_context_1 = require("@middleware/request-context");
const rate_limiter_1 = require("@middleware/rate-limiter");
const passport_config_1 = require("@config/passport.config");
const auth_routes_1 = __importDefault(require("@features/auth/auth.routes"));
const user_routes_1 = __importDefault(require("@features/users/user.routes"));
const role_routes_1 = __importDefault(require("@features/roles/role.routes"));
const permission_routes_1 = __importDefault(require("@features/permissions/permission.routes"));
const customer_routes_1 = __importDefault(require("@features/customers/customer.routes"));
const tag_routes_1 = __importDefault(require("@features/tags/tag.routes"));
const broadcast_routes_1 = __importDefault(require("@features/broadcasts/broadcast.routes"));
const template_routes_1 = __importDefault(require("@features/templates/template.routes"));
const group_routes_1 = __importDefault(require("@features/groups/group.routes"));
const media_routes_1 = __importDefault(require("@features/media/media.routes"));
const channel_account_routes_1 = require("@features/channel-accounts/channel-account.routes");
const webhook_routes_1 = require("@features/webhooks/webhook.routes");
const team_routes_1 = __importDefault(require("@features/teams/team.routes"));
const inbox_routes_1 = __importDefault(require("@features/inbox/inbox.routes"));
const health_routes_1 = require("@features/health/health.routes");
const custom_field_routes_1 = require("@features/custom-fields/custom-field.routes");
const invitation_routes_1 = require("@features/invitations/invitation.routes");
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
function createApp() {
    const app = (0, express_1.default)();
    // Request context middleware (must be first to attach correlation ID)
    app.use(request_context_1.requestContextMiddleware);
    // Security headers with SPA-friendly CSP in production
    const isProduction = process.env.NODE_ENV === 'production';
    app.use((0, helmet_1.default)({
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
    app.use((0, cors_1.default)({
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true, // Allow cookies (required for CSRF and refresh tokens)
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
        exposedHeaders: ['X-CSRF-Token'],
    }));
    // Body parsing
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    // Cookie parser for httpOnly refresh tokens and CSRF tokens
    app.use((0, cookie_parser_1.default)());
    // Configure Passport
    const passport = (0, passport_config_1.configurePassport)();
    app.use(passport.initialize());
    // Global rate limiting
    app.use(rate_limiter_1.generalLimiter);
    // Health check routes (no auth required, before other routes)
    // Provides /health, /health/live, /health/ready endpoints
    app.use('/health', (0, health_routes_1.createHealthRoutes)());
    // Webhook routes (must be before json body parser for raw body access)
    // These routes handle provider callbacks and have their own body parsing
    app.use('/webhooks', (0, webhook_routes_1.createWebhookRoutes)());
    // API routes
    // Note: CSRF protection is applied at route level, not globally
    // This allows exempting login/register routes while protecting others
    app.use('/api/auth', auth_routes_1.default);
    app.use('/api/users', user_routes_1.default);
    app.use('/api/roles', role_routes_1.default);
    app.use('/api/permissions', permission_routes_1.default);
    app.use('/api/customers', customer_routes_1.default);
    app.use('/api/tags', tag_routes_1.default);
    app.use('/api/broadcasts', broadcast_routes_1.default);
    app.use('/api/templates', template_routes_1.default);
    app.use('/api/groups', group_routes_1.default);
    app.use('/api/media', media_routes_1.default);
    app.use('/api/channel-accounts', (0, channel_account_routes_1.createChannelAccountRoutes)());
    app.use('/api/teams', team_routes_1.default);
    app.use('/api/inbox', inbox_routes_1.default);
    app.use('/api/custom-fields', (0, custom_field_routes_1.createCustomFieldRoutes)());
    app.use('/api/invitations', (0, invitation_routes_1.createInvitationRoutes)());
    // Serve static files in production (frontend build)
    if (process.env.NODE_ENV === 'production') {
        const publicPath = path_1.default.join(__dirname, '..', 'public');
        // Serve static assets with caching
        app.use(express_1.default.static(publicPath, {
            maxAge: '1d',
            etag: true,
        }));
        // SPA fallback: serve index.html for all non-API routes
        app.get('*', (req, res, next) => {
            // Skip API routes and health checks
            if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/webhooks')) {
                return next();
            }
            res.sendFile(path_1.default.join(publicPath, 'index.html'));
        });
    }
    // Global error handler (must be last)
    app.use(error_handler_1.errorHandler);
    return app;
}
