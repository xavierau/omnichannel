# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Local Development Setup

### Prerequisites

PostgreSQL and Redis Docker containers are **always running** in the dev environment. Do NOT spin up new containers.

### Environment Variables

The `.env` file in `backend/` is pre-configured:

```bash
# Database (Docker - already running)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=omnichannel_db
DATABASE_USER=postgres
DATABASE_PASSWORD=password

# Redis (Docker - already running)
REDIS_URL=redis://localhost:6379
```

### Database Migrations

```bash
cd backend
npm run migration:run    # Apply pending migrations
npm run migration:revert # Rollback last migration
npm run seed             # Seed initial data (roles, permissions)
```

## Commands

### Frontend
```bash
npm run dev      # Start Vite development server with HMR
npm run build    # TypeScript check + Vite production build
npm run lint     # Run ESLint
npm run preview  # Preview production build locally
```

### Backend
```bash
cd backend
npm run dev           # Start Express server with hot reload
npm run build         # Compile TypeScript
npm run start         # Run production build
npm run migration:run # Apply database migrations
npm run seed          # Seed initial data
```

### Adding Shadcn UI Components

```bash
npx shadcn@latest add [component-name]
```

## Architecture

This is a React + TypeScript frontend application for an omnichannel platform, built with Vite.

### Technology Stack
- **Build Tool**: Vite with `@vitejs/plugin-react`
- **Routing**: React Router v7 (`react-router-dom`)
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- **UI Components**: Shadcn UI (New York style, neutral base color)
- **Icons**: Lucide React

### Routes
| Route | Page |
|-------|------|
| `/` | Redirects to `/broadcasts` |
| `/broadcasts` | Broadcasts management |
| `/customers` | Customer management |
| `/templates` | WhatsApp templates |

### Path Aliases
The `@` alias maps to `./src` - use `@/components`, `@/lib`, `@/hooks` for imports.

### Shadcn UI Configuration
- Style: `new-york`
- Components: `src/components/ui/`
- Utilities: `src/lib/utils.ts` (exports `cn()` for className merging)
- Hooks: `src/hooks/`
- Not using React Server Components (`rsc: false`)

## Documentation

Review `doc/` directory for project specifications:
- `doc/technical/frontend-setup.md` - Frontend configuration details
- `doc/api/` - API specifications (pending)
- `doc/design/` - UI/UX designs (pending)
- `doc/requirements/` - Product requirements (pending)