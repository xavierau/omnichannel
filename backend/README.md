# Omnichannel Backend - Authentication & RBAC System

Production-ready Express + TypeScript backend with Passport.js authentication and Role-Based Access Control (RBAC) with resource ownership.

## Technology Stack

- **Framework:** Express.js + TypeScript
- **Architecture:** Clean Layered Architecture (Controllers → Services → Repositories)
- **Database:** PostgreSQL with TypeORM
- **Authentication:** Passport.js (Local + JWT strategies)
- **Password Hashing:** Argon2id
- **Dependency Injection:** tsyringe
- **Validation:** express-validator
- **Security:** Helmet, CORS, rate limiting

## Features

✅ JWT-based authentication (access + refresh tokens)
✅ Role-Based Access Control (RBAC) with resource ownership
✅ 4 user roles: Super Admin, Admin, Manager, Agent
✅ Permission format: `resource:action:scope` (e.g., `broadcasts:update:own`)
✅ Argon2id password hashing
✅ httpOnly cookies for refresh tokens
✅ Rate limiting on authentication endpoints
✅ Comprehensive error handling
✅ Type-safe end-to-end

## Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 14.x
- npm or yarn

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database

Create a PostgreSQL database:

```bash
createdb omnichannel_db
```

Or using psql:

```sql
CREATE DATABASE omnichannel_db;
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update with your configuration:

```bash
cp .env.example .env
```

**Important:** Update the following in `.env`:

```env
# Database credentials
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=omnichannel_db
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password

# Generate secure JWT secrets (use crypto.randomBytes(64).toString('hex'))
JWT_ACCESS_SECRET=your_generated_secret_here
JWT_REFRESH_SECRET=your_generated_different_secret_here
```

To generate secure JWT secrets in Node.js:

```javascript
require('crypto').randomBytes(64).toString('hex')
```

### 4. Run Database Migrations

```bash
npm run migration:run
```

This will create all necessary tables (users, roles, permissions, refresh_tokens, etc.).

### 5. Seed Initial Data

```bash
npm run seed
```

This will populate:
- 4 roles (Super Admin, Admin, Manager, Agent)
- 60+ permissions across all resources
- Default super admin user:
  - Email: `admin@example.com`
  - Password: `ChangeMe123!` (⚠️ **CHANGE IMMEDIATELY IN PRODUCTION**)

## Development

### Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3000` with hot-reload enabled.

### Available Scripts

```bash
npm run dev              # Start development server with hot-reload
npm run build            # Build for production
npm run start            # Start production server
npm run migration:generate  # Generate migration from entity changes
npm run migration:run    # Run pending migrations
npm run migration:revert # Revert last migration
npm run seed             # Run database seeds
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:cov         # Run tests with coverage
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
```

## Project Structure

```
backend/
├── src/
│   ├── server.ts                    # Application entry point
│   ├── app.ts                       # Express app configuration
│   │
│   ├── config/                      # Configuration files
│   │   ├── database.config.ts       # TypeORM DataSource
│   │   ├── jwt.config.ts            # JWT configuration
│   │   └── di.container.ts          # Dependency injection
│   │
│   ├── features/                    # Feature-based modules
│   │   ├── auth/                    # Authentication
│   │   ├── users/                   # User management
│   │   ├── roles/                   # Role management
│   │   ├── permissions/             # Permission management
│   │   └── broadcasts/              # Example resource
│   │
│   ├── middleware/                  # Express middleware
│   │   ├── authenticate.ts          # JWT authentication
│   │   ├── authorize.ts             # Permission checking
│   │   ├── check-ownership.ts       # Resource ownership
│   │   ├── error-handler.ts         # Global error handling
│   │   └── async-handler.ts         # Async wrapper
│   │
│   ├── database/                    # Migrations & seeds
│   │   ├── migrations/
│   │   └── seeds/
│   │
│   ├── shared/                      # Shared utilities
│   │   ├── exceptions/              # Custom exceptions
│   │   ├── interfaces/              # TypeScript interfaces
│   │   └── utils/                   # Utility functions
│   │
│   └── types/                       # Type definitions
│       └── express.d.ts             # Express extensions
│
├── .env                             # Environment variables (not in git)
├── .env.example                     # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication (Coming Soon)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout and revoke tokens
- `GET /api/auth/me` - Get current user info

### Users (Coming Soon)
- `GET /api/users/me` - Get current user
- `PATCH /api/users/me` - Update current user
- `POST /api/users` - Create user (admin only)

## RBAC System

### Roles

| Role | Level | Description |
|------|-------|-------------|
| Super Admin | 1 | Full system access including user management |
| Admin | 2 | Manage broadcasts, customers, templates, conversations |
| Manager | 3 | Create/edit own content, view all content |
| Agent | 4 | Limited access, mainly view-only |

### Permission Format

Permissions follow the format: `resource:action:scope`

- **Resource:** broadcasts, customers, templates, conversations, users, etc.
- **Action:** create, read, update, delete, manage
- **Scope:** all (access all resources), own (access only owned resources)

**Examples:**
- `broadcasts:create:all` - Can create any broadcast
- `broadcasts:update:own` - Can only update own broadcasts
- `customers:read:all` - Can read all customers

### Ownership Checks

Resources with `created_by` field support ownership checks:
- Users with `:own` scope can only access resources they created
- Users with `:all` scope can access all resources regardless of ownership
- Admins bypass ownership checks

## Security Features

- ✅ Argon2id password hashing (memory-hard, GPU-resistant)
- ✅ JWT access tokens (15min expiry)
- ✅ Refresh tokens (7 days, stored in database, httpOnly cookies)
- ✅ Rate limiting (5 login attempts/min, 100 general requests/min)
- ✅ Helmet security headers
- ✅ CORS configuration
- ✅ Input validation (express-validator)
- ✅ SQL injection prevention (TypeORM parameterized queries)
- ✅ Graceful error handling

## Database Schema

### Core Tables

- **users** - User accounts with email, password hash, status
- **roles** - Role definitions with hierarchy levels
- **permissions** - Fine-grained permissions
- **user_roles** - Many-to-many relationship between users and roles
- **role_permissions** - Many-to-many relationship between roles and permissions
- **refresh_tokens** - Active refresh tokens for session management

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:cov
```

## Production Deployment

### 1. Build the Application

```bash
npm run build
```

### 2. Set Production Environment Variables

Update `.env` for production:

```env
NODE_ENV=production
DATABASE_HOST=your_production_db_host
# ... other production configs
```

### 3. Run Migrations

```bash
npm run migration:run
```

### 4. Start the Server

```bash
npm start
```

Or use a process manager like PM2:

```bash
pm2 start dist/server.js --name omnichannel-api
```

## Troubleshooting

### Database Connection Issues

1. Ensure PostgreSQL is running:
   ```bash
   pg_isready
   ```

2. Verify database credentials in `.env`

3. Check if database exists:
   ```bash
   psql -l | grep omnichannel_db
   ```

### Migration Issues

If migrations fail, you can reset the database:

```bash
# Revert all migrations
npm run migration:revert

# Run migrations again
npm run migration:run
```

### Port Already in Use

If port 3000 is in use, change `PORT` in `.env`:

```env
PORT=3001
```

## Contributing

This project follows Clean Architecture principles and SOLID design patterns. Please ensure:

- All new code includes tests
- Follow existing code structure and naming conventions
- Use TypeScript strict mode
- Document new features in this README

## License

ISC
