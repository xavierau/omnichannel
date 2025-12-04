# Frontend Setup Guide

This document outlines the technical setup for the Omnichannel Frontend application.

## Technology Stack

- **Framework**: [Vite](https://vitejs.dev/) with React and TypeScript
- **Routing**: [React Router v7](https://reactrouter.com/) (`react-router-dom`)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## Configuration

### Vite & Tailwind CSS v4
The project uses `@tailwindcss/vite` for a streamlined setup.

**`vite.config.ts`**:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

**`src/index.css`**:
```css
@import "tailwindcss";
/* ... shadcn theme variables ... */
```

### Shadcn UI
Shadcn is configured with the following settings:
- **Style**: New York
- **Base Color**: Neutral
- **CSS Variables**: Yes
- **Components Directory**: `src/components/ui`
- **Utils**: `src/lib/utils.ts`

**`components.json`**:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### React Router
Routes are configured in `src/App.tsx` using `BrowserRouter`.

**Current Routes**:
| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Navigate` | Redirects to `/broadcasts` |
| `/broadcasts` | `BroadcastsPage` | Broadcast management |
| `/customers` | `CustomersPage` | Customer management |
| `/templates` | `WhatsAppTemplatesPage` | WhatsApp template management |

**Usage**:
```tsx
import { Link, useNavigate } from "react-router-dom"

// Declarative navigation
<Link to="/customers">Go to Customers</Link>

// Programmatic navigation
const navigate = useNavigate()
navigate("/broadcasts")
```

## Usage

### Development Server
Start the local development server:
```bash
npm run dev
```

### Building for Production
Build the application for production:
```bash
npm run build
```

### Adding Components
Use the Shadcn CLI to add new components:
```bash
npx shadcn@latest add [component-name]
```
Example:
```bash
npx shadcn@latest add button
```
