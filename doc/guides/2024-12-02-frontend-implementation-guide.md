# Frontend Implementation Guide

This guide provides patterns and conventions for building features in the Omnichannel Platform. Reference this when implementing new pages, components, or features.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Component Patterns](#component-patterns)
3. [DataTable Usage](#datatable-usage)
4. [Custom UI Components](#custom-ui-components)
5. [Page Implementation](#page-implementation)
6. [Styling Conventions](#styling-conventions)
7. [TypeScript Patterns](#typescript-patterns)
8. [Common Recipes](#common-recipes)

---

## Project Structure

```
src/
├── components/
│   ├── ui/                    # Shadcn UI + custom base components
│   │   ├── button.tsx
│   │   ├── tag-badge.tsx
│   │   └── ...
│   └── data-table/            # Reusable DataTable system
│       ├── index.ts
│       ├── types.ts
│       ├── DataTable.tsx
│       └── ...
├── pages/
│   └── [feature]/             # Feature-based page organization
│       ├── index.ts           # Public exports
│       ├── [Feature]Page.tsx  # Main page component
│       ├── types.ts           # Feature-specific types
│       ├── components/        # Page-specific components
│       ├── hooks/             # Page-specific hooks
│       └── data/              # Mock data (for development)
├── lib/
│   ├── utils.ts               # Utility functions (cn, etc.)
│   └── export-utils.ts        # Export helpers
└── hooks/                     # Shared custom hooks
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `CustomerTable.tsx` |
| Hooks | camelCase with `use` prefix | `useCustomers.ts` |
| Types | PascalCase | `Customer`, `CustomerFilters` |
| Utils | camelCase | `exportToCSV` |
| Pages | PascalCase with `Page` suffix | `CustomersPage.tsx` |

---

## Component Patterns

### Base Component Pattern

Use this pattern for reusable UI components:

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// 1. Define variants using CVA
const componentVariants = cva(
  "base-classes-here",
  {
    variants: {
      variant: {
        default: "variant-classes",
        secondary: "secondary-classes",
      },
      size: {
        default: "size-classes",
        sm: "small-classes",
        lg: "large-classes",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// 2. Define props interface
export interface ComponentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof componentVariants> {
  // Additional props here
}

// 3. Create component with forwardRef
const Component = React.forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(componentVariants({ variant, size }), className)}
        {...props}
      />
    )
  }
)
Component.displayName = "Component"

export { Component, componentVariants }
```

### Page-Specific Component Pattern

For components used only within a specific page:

```tsx
// src/pages/customers/components/CustomerActions.tsx
import type { Customer } from "../types"

interface CustomerActionsProps {
  customer: Customer
  onView?: (customer: Customer) => void
  onEdit?: (customer: Customer) => void
  onDelete?: (customer: Customer) => Promise<void>
}

export function CustomerActions({
  customer,
  onView,
  onEdit,
  onDelete,
}: CustomerActionsProps) {
  // Implementation
}
```

---

## DataTable Usage

The DataTable component is a generic, reusable table built on TanStack Table.

### Basic Usage

```tsx
import { DataTable, type ColumnDef } from "@/components/data-table"

interface User {
  id: string
  name: string
  email: string
}

const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
]

function UsersPage() {
  const [users] = useState<User[]>([])

  return (
    <DataTable
      columns={columns}
      data={users}
      searchPlaceholder="Search users..."
    />
  )
}
```

### With Row Selection

```tsx
import { Checkbox } from "@/components/ui/checkbox"
import { DataTable, DataTableColumnHeader, type ColumnDef } from "@/components/data-table"

const columns: ColumnDef<User>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  // ... more columns
]

function UsersPage() {
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])

  return (
    <DataTable
      columns={columns}
      data={users}
      enableRowSelection
      onSelectionChange={setSelectedUsers}
    />
  )
}
```

### With Bulk Actions

```tsx
import type { BulkAction } from "@/components/data-table"
import { Trash2, Download } from "lucide-react"

const bulkActions: BulkAction<User>[] = [
  {
    id: "delete",
    label: "Delete",
    icon: <Trash2 className="size-4" />,
    variant: "destructive",
    onClick: async (users) => {
      // Handle delete
    },
  },
  {
    id: "export",
    label: "Export",
    icon: <Download className="size-4" />,
    onClick: (users) => {
      exportToCSV(users, "users")
    },
  },
]

<DataTable
  columns={columns}
  data={users}
  enableRowSelection
  bulkActions={bulkActions}
/>
```

### With Custom Toolbar

```tsx
<DataTable
  columns={columns}
  data={filteredData}
  renderToolbar={() => (
    <div className="flex items-center gap-4">
      <Input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <TagSelector
        options={tags}
        selected={selectedTags}
        onChange={setSelectedTags}
      />
    </div>
  )}
/>
```

### DataTable Props Reference

| Prop | Type | Description |
|------|------|-------------|
| `columns` | `ColumnDef<T>[]` | Column definitions |
| `data` | `T[]` | Data array |
| `isLoading` | `boolean` | Show loading skeleton |
| `pageSize` | `number` | Initial page size (default: 10) |
| `pageSizeOptions` | `number[]` | Page size options |
| `enableRowSelection` | `boolean` | Enable row checkboxes |
| `onSelectionChange` | `(rows: T[]) => void` | Selection callback |
| `bulkActions` | `BulkAction<T>[]` | Bulk action buttons |
| `searchPlaceholder` | `string` | Search input placeholder |
| `emptyStateTitle` | `string` | Empty state title |
| `emptyStateDescription` | `string` | Empty state description |
| `emptyStateIcon` | `ReactNode` | Empty state icon |
| `renderToolbar` | `() => ReactNode` | Custom toolbar renderer |

---

## Custom UI Components

### TagBadge

Colored badge for displaying tags:

```tsx
import { TagBadge } from "@/components/ui/tag-badge"

// Basic usage
<TagBadge color="blue">VIP</TagBadge>
<TagBadge color="green" size="sm">Active</TagBadge>

// Removable
<TagBadge color="purple" removable onRemove={() => handleRemove()}>
  Premium
</TagBadge>
```

**Colors**: `blue`, `green`, `yellow`, `red`, `purple`, `pink`, `orange`, `gray`
**Sizes**: `default`, `sm`, `lg`

### TagSelector

Multi-select component for tags:

```tsx
import { TagSelector, type TagOption } from "@/components/ui/tag-selector"

const tagOptions: TagOption[] = [
  { id: "1", name: "VIP", color: "purple" },
  { id: "2", name: "Active", color: "green" },
]

<TagSelector
  options={tagOptions}
  selected={selectedTagIds}
  onChange={setSelectedTagIds}
  placeholder="Select tags..."
/>
```

### DateRangePicker

Date range selection:

```tsx
import { DateRangePicker } from "@/components/ui/date-range-picker"
import type { DateRange } from "react-day-picker"

const [dateRange, setDateRange] = useState<DateRange | undefined>()

<DateRangePicker
  value={dateRange}
  onChange={setDateRange}
  placeholder="Select date range..."
/>
```

### ConfirmDialog

Confirmation dialog with async support:

```tsx
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

const [showDialog, setShowDialog] = useState(false)

<ConfirmDialog
  open={showDialog}
  onOpenChange={setShowDialog}
  title="Delete Item"
  description="Are you sure? This action cannot be undone."
  confirmText="Delete"
  variant="destructive"
  onConfirm={async () => {
    await deleteItem()
    // Dialog closes automatically on success
  }}
/>
```

### EmptyState

Empty state display:

```tsx
import { EmptyState } from "@/components/ui/empty-state"
import { Users, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

<EmptyState
  icon={<Users className="size-8 text-muted-foreground" />}
  title="No customers found"
  description="Get started by adding your first customer."
  action={
    <Button>
      <Plus className="mr-2 size-4" />
      Add Customer
    </Button>
  }
/>
```

---

## Page Implementation

### Standard Page Structure

```tsx
// src/pages/products/ProductsPage.tsx
import * as React from "react"
import { Plus } from "lucide-react"

import { DataTable, type BulkAction } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import type { Product } from "./types"
import { getProductColumns } from "./components/ProductTable"
import { ProductFilters } from "./components/ProductFilters"

export function ProductsPage() {
  // State
  const [products, setProducts] = React.useState<Product[]>([])
  const [filters, setFilters] = React.useState(defaultFilters)
  const [selectedProducts, setSelectedProducts] = React.useState<Product[]>([])
  const [isLoading] = React.useState(false)

  // Filtered data
  const filteredProducts = React.useMemo(() => {
    return products.filter((product) => {
      // Apply filters
      return true
    })
  }, [products, filters])

  // Column definitions
  const columns = React.useMemo(
    () => getProductColumns({
      onView: (product) => { /* navigate */ },
      onEdit: (product) => { /* open dialog */ },
      onDelete: async (product) => { /* delete */ },
    }),
    []
  )

  // Bulk actions
  const bulkActions: BulkAction<Product>[] = [
    // Define bulk actions
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground">
            Manage your product catalog.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 size-4" />
          Add Product
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredProducts}
        isLoading={isLoading}
        enableRowSelection
        onSelectionChange={setSelectedProducts}
        bulkActions={bulkActions}
        renderToolbar={() => (
          <ProductFilters filters={filters} onFiltersChange={setFilters} />
        )}
      />
    </div>
  )
}
```

### Column Definition Pattern

```tsx
// src/pages/products/components/ProductTable.tsx
import type { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"
import type { Product } from "../types"
import { ProductActions } from "./ProductActions"

interface ProductTableColumnsProps {
  onView?: (product: Product) => void
  onEdit?: (product: Product) => void
  onDelete?: (product: Product) => Promise<void>
}

export function getProductColumns({
  onView,
  onEdit,
  onDelete,
}: ProductTableColumnsProps = {}): ColumnDef<Product>[] {
  return [
    // Selection column
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    // Sortable column
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    // Custom cell renderer
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => {
        const price = row.getValue("price") as number
        return <div className="text-right">${price.toFixed(2)}</div>
      },
    },
    // Actions column
    {
      id: "actions",
      cell: ({ row }) => (
        <ProductActions
          product={row.original}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ),
      enableHiding: false,
    },
  ]
}
```

---

## Styling Conventions

### Color Usage

```tsx
// Semantic colors
<div className="bg-background text-foreground" />      // Page background
<div className="bg-card text-card-foreground" />       // Card surfaces
<div className="bg-muted text-muted-foreground" />     // Subtle backgrounds
<div className="bg-primary text-primary-foreground" /> // Primary actions
<div className="text-destructive" />                   // Error/delete text

// Status colors
<div className="bg-success text-success-foreground" /> // Success states
<div className="bg-warning text-warning-foreground" /> // Warning states
<div className="bg-info text-info-foreground" />       // Info states

// Tag colors (with transparency)
<div className="bg-tag-blue/20 text-tag-blue border border-tag-blue/30" />
```

### Spacing Patterns

```tsx
// Page layout
<div className="flex flex-col gap-6 p-6">

// Card content
<div className="p-4 space-y-4">

// Form fields
<div className="space-y-3">

// Inline elements
<div className="flex items-center gap-2">

// Button groups
<div className="flex items-center gap-1">
```

### Typography

```tsx
// Page title
<h1 className="text-2xl font-semibold text-foreground">Title</h1>

// Page description
<p className="text-sm text-muted-foreground">Description</p>

// Section heading
<h2 className="text-xl font-medium">Section</h2>

// Labels
<label className="text-sm font-medium">Label</label>

// Helper text
<span className="text-xs text-muted-foreground">Helper</span>
```

### Icon Sizing

```tsx
// In buttons
<Button>
  <Plus className="mr-2 size-4" />
  Add Item
</Button>

// Icon-only buttons
<Button size="icon">
  <Trash2 className="size-4" />
</Button>

// Inline with text
<span className="flex items-center gap-2">
  <Phone className="size-4 text-muted-foreground" />
  +1 555-123-4567
</span>
```

---

## TypeScript Patterns

### Type Definitions

```tsx
// src/pages/feature/types.ts
import type { TagColor } from "@/components/ui/tag-badge"

export interface Entity {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface Tag {
  id: string
  name: string
  color: TagColor
}

export interface EntityFilters {
  search: string
  tags: string[]
  dateRange: {
    from: Date | undefined
    to: Date | undefined
  }
}

export const defaultFilters: EntityFilters = {
  search: "",
  tags: [],
  dateRange: {
    from: undefined,
    to: undefined,
  },
}
```

### Type-Only Imports

Always use type-only imports for types:

```tsx
// Correct
import type { ColumnDef } from "@tanstack/react-table"
import type { DateRange } from "react-day-picker"

// Incorrect (will cause build errors)
import { ColumnDef } from "@tanstack/react-table"
```

---

## Common Recipes

### Export to CSV/Excel

```tsx
import { exportToCSV, exportToExcel } from "@/lib/export-utils"

// Transform data for export
const exportData = items.map((item) => ({
  Name: item.name,
  Email: item.email,
  "Created At": item.createdAt.toISOString(),
  Tags: item.tags.map((t) => t.name).join(", "),
}))

// Export
exportToCSV(exportData, "items")    // items.csv
exportToExcel(exportData, "items")  // items.xlsx
```

### Row Action Menu

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Eye, Pencil, Trash2, MoreHorizontal } from "lucide-react"

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" className="size-8 p-0">
      <MoreHorizontal className="size-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => onView(item)}>
      <Eye className="mr-2 size-4" />
      View
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => onEdit(item)}>
      <Pencil className="mr-2 size-4" />
      Edit
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem
      onClick={() => onDelete(item)}
      className="text-destructive focus:text-destructive"
    >
      <Trash2 className="mr-2 size-4" />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### WhatsApp Link

```tsx
const handleMessage = (phoneNumber: string) => {
  const cleanNumber = phoneNumber.replace(/[^0-9+]/g, "")
  window.open(`https://wa.me/${cleanNumber.replace("+", "")}`, "_blank")
}
```

### Debounced Search

```tsx
import * as React from "react"

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// Usage
const [search, setSearch] = React.useState("")
const debouncedSearch = useDebounce(search, 300)

React.useEffect(() => {
  // Fetch data with debouncedSearch
}, [debouncedSearch])
```

### Loading States

```tsx
// Full page loading
if (isLoading) {
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  )
}

// DataTable handles its own loading state
<DataTable
  columns={columns}
  data={data}
  isLoading={isLoading}  // Shows skeleton
/>

// Button loading
<Button disabled={isSubmitting}>
  {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
  Save
</Button>
```

---

## Quick Reference

### Installing New Shadcn Components

```bash
npx shadcn@latest add [component-name]
```

### Running Development Server

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

### Type Checking

```bash
npx tsc --noEmit
```

---

## Related Documents

- [Style Guide](../design/style-guide.md) - Colors, typography, spacing
- [Frontend Setup](../technical/frontend-setup.md) - Initial configuration
