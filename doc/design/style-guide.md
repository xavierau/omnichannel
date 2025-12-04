# Omnichannel Platform Style Guide

This document defines the design system for the Omnichannel Platform UI.

## Color System

The platform uses the OKLCH color space for perceptually uniform color representation.

### Semantic Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `primary` | Dark neutral | Light neutral | Primary actions, buttons |
| `secondary` | Light gray | Dark gray | Secondary actions |
| `destructive` | Red-orange | Brighter red | Delete, dangerous actions |
| `muted` | Light gray | Dark gray | Disabled states, subtle text |
| `accent` | Light gray | Dark gray | Highlights, hover states |

### Status Colors

| Token | Purpose |
|-------|---------|
| `success` | Positive feedback, completed states |
| `warning` | Caution, pending states |
| `info` | Informational messages |

### Tag Colors

Use these for customer tags and badges:

| Token | Color |
|-------|-------|
| `tag-blue` | Blue |
| `tag-green` | Green |
| `tag-yellow` | Yellow |
| `tag-red` | Red |
| `tag-purple` | Purple |
| `tag-pink` | Pink |
| `tag-orange` | Orange |
| `tag-gray` | Gray |

### Usage in Tailwind

```tsx
// Background colors
<div className="bg-primary" />
<div className="bg-success" />
<div className="bg-tag-blue" />

// Text colors
<span className="text-foreground" />
<span className="text-muted-foreground" />
<span className="text-success-foreground" />
```

---

## Typography

The platform uses the system font stack via Tailwind CSS defaults.

### Scale

| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 12px | Labels, badges, helper text |
| `text-sm` | 14px | Body text, table cells, form inputs |
| `text-base` | 16px | Default body text |
| `text-lg` | 18px | Subheadings |
| `text-xl` | 20px | Section titles |
| `text-2xl` | 24px | Page titles |
| `text-3xl` | 30px | Hero text |
| `text-4xl` | 36px | Large display |

### Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Labels, buttons, table headers |
| `font-semibold` | 600 | Headings, emphasis |
| `font-bold` | 700 | Strong emphasis |

### Examples

```tsx
// Page title
<h1 className="text-2xl font-semibold text-foreground">Customers</h1>

// Section title
<h2 className="text-xl font-medium text-foreground">Recent Activity</h2>

// Body text
<p className="text-sm text-muted-foreground">No customers found.</p>

// Label
<label className="text-sm font-medium">Email Address</label>
```

---

## Spacing

Base unit: 4px (Tailwind default rem scale)

### Common Patterns

| Pattern | Class | Pixels | Usage |
|---------|-------|--------|-------|
| Tight | `gap-1` | 4px | Inline elements, icon-text pairs |
| Related | `gap-2` | 8px | Related elements, button groups |
| Form | `gap-3` | 12px | Form field spacing |
| Card | `gap-4` | 16px | Card content spacing |
| Section | `gap-6` | 24px | Major sections |
| Page | `gap-8` | 32px | Page sections |

### Container Padding

| Context | Class | Usage |
|---------|-------|-------|
| Card content | `p-4` | Inside cards |
| Page content | `p-6` | Main content areas |
| Table header | `px-6 py-4` | Table header/footer |
| Table cell | `px-4 py-3` | Table data cells |

---

## Border Radius

The theme defines a radius system based on `--radius: 0.625rem (10px)`.

| Class | Size | Usage |
|-------|------|-------|
| `rounded-sm` | 6px | Small elements |
| `rounded-md` | 8px | Inputs, buttons |
| `rounded-lg` | 10px | Cards, containers |
| `rounded-xl` | 14px | Large containers |
| `rounded-full` | 9999px | Pills, badges, avatars |

---

## Components

### Buttons

**Variants:**
- `default` - Primary actions (dark background)
- `secondary` - Secondary actions (light background)
- `outline` - Tertiary actions (bordered)
- `ghost` - Inline actions, icon buttons
- `destructive` - Delete, dangerous actions
- `link` - Navigation, inline links

**Sizes:**
- `default` - h-9, px-4
- `sm` - h-8, px-3
- `lg` - h-10, px-6
- `icon` - size-9
- `icon-sm` - size-8
- `icon-lg` - size-10

```tsx
import { Button } from "@/components/ui/button"

<Button>Primary Action</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button size="sm">Small</Button>
<Button size="icon"><Plus className="size-4" /></Button>
```

### Badges

Use for tags, status indicators, and counts.

```tsx
import { Badge } from "@/components/ui/badge"

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Error</Badge>
```

### Cards

Container for grouped content.

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content goes here.
  </CardContent>
</Card>
```

### Inputs

Standard form input styling.

```tsx
import { Input } from "@/components/ui/input"

<Input placeholder="Enter text..." />
<Input type="email" placeholder="email@example.com" />
```

---

## Icons

The platform uses Lucide React for icons.

### Sizes

| Class | Size | Usage |
|-------|------|-------|
| `size-4` | 16px | Inside buttons, inline with text |
| `size-5` | 20px | Standalone small icons |
| `size-6` | 24px | Navigation, headers |

### Common Icons

**Actions:**
- `Eye` - View
- `Pencil` - Edit
- `Trash2` - Delete
- `Plus` - Add
- `X` - Close/Remove
- `MoreHorizontal` - More actions

**Navigation:**
- `ChevronDown`, `ChevronUp`, `ChevronLeft`, `ChevronRight`
- `ArrowUpDown`, `ArrowUp`, `ArrowDown` - Sorting

**Communication:**
- `MessageCircle`, `Send` - Messaging
- `Phone` - Phone/WhatsApp

**Organization:**
- `Tag`, `Tags` - Tagging
- `Search` - Search
- `Filter`, `SlidersHorizontal` - Filtering
- `Download`, `Upload` - Import/Export

**Status:**
- `Check` - Success/Selected
- `AlertCircle` - Warning
- `XCircle` - Error
- `Loader2` - Loading (animated)

### Usage

```tsx
import { Search, Trash2, MoreHorizontal } from "lucide-react"

// In button
<Button size="icon" variant="ghost">
  <Trash2 className="size-4" />
</Button>

// Inline with text
<span className="flex items-center gap-2">
  <Search className="size-4 text-muted-foreground" />
  Search
</span>
```

---

## Interactive States

### Focus

All interactive elements use a consistent focus ring:

```css
focus-visible:ring-ring/50 focus-visible:ring-[3px]
```

### Hover

Use transparency modulation for hover states:

```tsx
// Button hover
hover:bg-primary/90

// Ghost hover
hover:bg-accent hover:text-accent-foreground
```

### Disabled

```tsx
disabled:pointer-events-none disabled:opacity-50
```

---

## Dark Mode

The platform supports dark mode via the `.dark` class on the root element.

All semantic colors automatically adjust. Use Tailwind's dark: prefix for custom overrides:

```tsx
<div className="bg-white dark:bg-gray-900">
  Dark mode aware content
</div>
```

---

## Responsive Breakpoints

| Prefix | Min Width | Usage |
|--------|-----------|-------|
| `sm` | 640px | Small tablets |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

### Mobile-First Pattern

```tsx
// Single column on mobile, two columns on tablet+
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  ...
</div>
```

---

## Accessibility

### Color Contrast

All color combinations meet WCAG 2.1 AA standards. Use semantic color pairs:
- `primary` with `primary-foreground`
- `success` with `success-foreground`
- etc.

### Focus Management

- All interactive elements are keyboard accessible
- Focus rings are visible and high contrast
- Use `focus-visible` for keyboard-only focus indicators

### Semantic HTML

- Use proper heading hierarchy (h1, h2, h3...)
- Use `<button>` for actions, `<a>` for navigation
- Include `aria-label` for icon-only buttons

```tsx
<Button size="icon" aria-label="Delete customer">
  <Trash2 className="size-4" />
</Button>
```
