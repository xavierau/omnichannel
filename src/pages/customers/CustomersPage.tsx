import * as React from "react"
import {
  Download,
  FileSpreadsheet,
  ListPlus,
  Loader2,
  Plus,
  Send,
  Tag as TagIcon,
  Trash2,
  Users,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"

import { DataTable, type BulkAction } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { exportToCSV, exportToExcel } from "@/lib/export-utils"
import { customerService, type Customer as ApiCustomer } from "@/services/customer.service"
import { tagService, type Tag as ApiTag } from "@/services/tag.service"
import type {
  Customer,
  Tag,
  CustomerFilters as CustomerFiltersType,
  CustomerFormData,
} from "./types"
import { defaultFilters } from "./types"
import { getCustomerColumns } from "./components/CustomerTable"
import { CustomerFilters } from "./components/CustomerFilters"
import { CustomerFormDialog } from "./components/CustomerFormDialog"

/**
 * Transforms API customer response to local Customer type
 * Handles date string to Date conversion
 */
function transformCustomer(apiCustomer: ApiCustomer): Customer {
  return {
    ...apiCustomer,
    tags: apiCustomer.tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
    })),
    createdAt: new Date(apiCustomer.createdAt),
    updatedAt: new Date(apiCustomer.updatedAt),
  }
}

/**
 * Transforms API tag response to local Tag type
 */
function transformTag(apiTag: ApiTag): Tag {
  return {
    id: apiTag.id,
    name: apiTag.name,
    color: apiTag.color,
  }
}

export function CustomersPage() {
  const [customers, setCustomers] = React.useState<Customer[]>([])
  const [tags, setTags] = React.useState<Tag[]>([])
  const [filters, setFilters] = React.useState<CustomerFiltersType>(defaultFilters)
  const [selectedCustomers, setSelectedCustomers] = React.useState<Customer[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = React.useState(false)
  const [formDialogOpen, setFormDialogOpen] = React.useState(false)
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | undefined>(undefined)

  // Fetch customers and tags on mount
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const [customersRes, tagsRes] = await Promise.all([
          customerService.getCustomers({}),
          tagService.getTags(),
        ])
        setCustomers(customersRes.data.map(transformCustomer))
        setTags(tagsRes.map(transformTag))
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load data"
        setError(message)
        toast.error("Failed to load customers", { description: message })
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // Filter customers based on current filters
  const filteredCustomers = React.useMemo(() => {
    return customers.filter((customer) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesName = customer.name.toLowerCase().includes(searchLower)
        const matchesPhone = customer.whatsappNumber.includes(filters.search)
        if (!matchesName && !matchesPhone) return false
      }

      // Tag filter
      if (filters.tags.length > 0) {
        const customerTagIds = customer.tags.map((t) => t.id)
        const hasMatchingTag = filters.tags.some((tagId) =>
          customerTagIds.includes(tagId)
        )
        if (!hasMatchingTag) return false
      }

      // Date range filter
      if (filters.dateRange.from) {
        if (customer.createdAt < filters.dateRange.from) return false
      }
      if (filters.dateRange.to) {
        if (customer.createdAt > filters.dateRange.to) return false
      }

      return true
    })
  }, [customers, filters])

  // Delete a single customer via API
  const handleDeleteCustomer = React.useCallback(async (customer: Customer) => {
    try {
      await customerService.deleteCustomer(customer.id)
      setCustomers((prev) => prev.filter((c) => c.id !== customer.id))
      toast.success("Customer deleted", { description: `${customer.name} has been removed.` })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete customer"
      toast.error("Delete failed", { description: message })
    }
  }, [])

  // Column definitions with action handlers
  const columns = React.useMemo(
    () =>
      getCustomerColumns({
        onView: (customer) => {
          console.log("View customer:", customer)
          // TODO: Navigate to customer detail page
        },
        onEdit: (customer) => {
          setEditingCustomer(customer)
          setFormDialogOpen(true)
        },
        onDelete: handleDeleteCustomer,
        onMessage: (customer) => {
          console.log("Message customer:", customer)
        },
      }),
    [handleDeleteCustomer]
  )

  // Bulk actions
  const bulkActions: BulkAction<Customer>[] = [
    {
      id: "delete",
      label: "Delete",
      icon: <Trash2 className="size-4" />,
      variant: "destructive",
      onClick: () => setShowBulkDeleteDialog(true),
    },
    {
      id: "export-csv",
      label: "CSV",
      icon: <Download className="size-4" />,
      onClick: (customers) => {
        exportToCSV(
          customers.map((c) => ({
            Name: c.name,
            "WhatsApp Number": c.whatsappNumber,
            Tags: c.tags.map((t) => t.name).join(", "),
            "Created At": c.createdAt.toISOString(),
          })),
          "customers"
        )
      },
    },
    {
      id: "export-excel",
      label: "Excel",
      icon: <FileSpreadsheet className="size-4" />,
      onClick: (customers) => {
        exportToExcel(
          customers.map((c) => ({
            Name: c.name,
            "WhatsApp Number": c.whatsappNumber,
            Tags: c.tags.map((t) => t.name).join(", "),
            "Created At": c.createdAt.toISOString(),
          })),
          "customers"
        )
      },
    },
    {
      id: "add-tags",
      label: "Add Tags",
      icon: <TagIcon className="size-4" />,
      onClick: (customers) => {
        console.log("Add tags to:", customers)
        // TODO: Open tag management dialog
      },
    },
    {
      id: "broadcast",
      label: "Broadcast",
      icon: <Send className="size-4" />,
      onClick: (customers) => {
        console.log("Send broadcast to:", customers)
        // TODO: Open broadcast dialog
      },
    },
    {
      id: "create-list",
      label: "Create List",
      icon: <ListPlus className="size-4" />,
      onClick: (customers) => {
        console.log("Create list from:", customers)
        // TODO: Open create list dialog
      },
    },
    {
      id: "add-to-list",
      label: "Add to List",
      icon: <Plus className="size-4" />,
      onClick: (customers) => {
        console.log("Add to existing list:", customers)
        // TODO: Open add to list dialog
      },
    },
  ]

  // Handle bulk delete via API
  const handleBulkDelete = React.useCallback(async () => {
    try {
      const selectedIds = selectedCustomers.map((c) => c.id)
      await customerService.bulkDelete(selectedIds)
      setCustomers((prev) => prev.filter((c) => !selectedIds.includes(c.id)))
      setSelectedCustomers([])
      toast.success("Customers deleted", {
        description: `${selectedIds.length} customer(s) have been removed.`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete customers"
      toast.error("Bulk delete failed", { description: message })
    }
  }, [selectedCustomers])

  // Handle add customer button click
  const handleAddCustomer = () => {
    setEditingCustomer(undefined)
    setFormDialogOpen(true)
  }

  // Handle form submission for both create and edit via API
  const handleFormSubmit = React.useCallback(
    async (data: CustomerFormData) => {
      try {
        if (editingCustomer) {
          // Update existing customer
          const updated = await customerService.updateCustomer(editingCustomer.id, {
            name: data.name,
            whatsappNumber: data.whatsappNumber,
            tagIds: data.tagIds,
            customFields: data.customFields,
          })
          const transformedCustomer = transformCustomer(updated)
          setCustomers((prev) =>
            prev.map((c) => (c.id === editingCustomer.id ? transformedCustomer : c))
          )
          toast.success("Customer updated", { description: `${data.name} has been updated.` })
        } else {
          // Create new customer
          const created = await customerService.createCustomer({
            name: data.name,
            whatsappNumber: data.whatsappNumber,
            tagIds: data.tagIds,
            customFields: data.customFields,
          })
          const transformedCustomer = transformCustomer(created)
          setCustomers((prev) => [transformedCustomer, ...prev])
          toast.success("Customer created", { description: `${data.name} has been added.` })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save customer"
        toast.error("Save failed", { description: message })
        throw err // Re-throw to keep dialog open on error
      }
    },
    [editingCustomer]
  )

  // Custom toolbar with advanced filters
  const renderToolbar = React.useCallback(
    () => (
      <div className="space-y-4">
        <CustomerFilters
          filters={filters}
          onFiltersChange={setFilters}
          availableTags={tags}
        />
      </div>
    ),
    [filters, tags]
  )

  // Show error state
  if (error && !isLoading && customers.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Customers</h1>
            <p className="text-sm text-muted-foreground">
              Manage your customer contacts and interactions.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <AlertCircle className="size-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Failed to load customers</h3>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Customers</h1>
            <p className="text-sm text-muted-foreground">
              Manage your customer contacts and interactions.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Loader2 className="size-12 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Loading customers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Manage your customer contacts and interactions.
          </p>
        </div>
        <Button onClick={handleAddCustomer}>
          <Plus className="mr-2 size-4" />
          Add Customer
        </Button>
      </div>

      {/* Data Table with Filters */}
      <DataTable
        columns={columns}
        data={filteredCustomers}
        isLoading={false}
        enableRowSelection
        onSelectionChange={setSelectedCustomers}
        bulkActions={bulkActions}
        searchPlaceholder="Search by name or phone..."
        emptyStateTitle="No customers found"
        emptyStateDescription="Get started by adding your first customer or adjust your filters."
        emptyStateIcon={<Users className="size-6 text-muted-foreground" />}
        renderToolbar={renderToolbar}
        pageSize={10}
        pageSizeOptions={[10, 20, 50, 100]}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        title="Delete Customers"
        description={`Are you sure you want to delete ${selectedCustomers.length} customer(s)? This action cannot be undone.`}
        confirmText="Delete All"
        variant="destructive"
        onConfirm={handleBulkDelete}
      />

      {/* Customer Form Dialog */}
      <CustomerFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        customer={editingCustomer}
        availableTags={tags}
        onSubmit={handleFormSubmit}
      />
    </div>
  )
}
