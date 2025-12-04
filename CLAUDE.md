# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Vite development server with HMR
npm run build    # TypeScript check + Vite production build
npm run lint     # Run ESLint
npm run preview  # Preview production build locally
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