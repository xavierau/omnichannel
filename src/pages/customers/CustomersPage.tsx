import * as React from "react"
import {
  Download,
  FileSpreadsheet,
  ListPlus,
  Plus,
  Send,
  Tag,
  Trash2,
  Users,
} from "lucide-react"

import { DataTable, type BulkAction } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { exportToCSV, exportToExcel } from "@/lib/export-utils"
import type {
  Customer,
  CustomerFilters as CustomerFiltersType,
  CustomerFormData,
} from "./types"
import { defaultFilters } from "./types"
import { mockCustomers, availableTags } from "./data/mock-customers"
import { getCustomerColumns } from "./components/CustomerTable"
import { CustomerFilters } from "./components/CustomerFilters"
import { CustomerFormDialog } from "./components/CustomerFormDialog"

export function CustomersPage() {
  const [customers, setCustomers] = React.useState<Customer[]>(mockCustomers)
  const [filters, setFilters] = React.useState<CustomerFiltersType>(defaultFilters)
  const [selectedCustomers, setSelectedCustomers] = React.useState<Customer[]>([])
  const [isLoading] = React.useState(false)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = React.useState(false)
  const [formDialogOpen, setFormDialogOpen] = React.useState(false)
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | undefined>(undefined)

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
        onDelete: async (customer) => {
          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 500))
          setCustomers((prev) => prev.filter((c) => c.id !== customer.id))
        },
        onMessage: (customer) => {
          console.log("Message customer:", customer)
        },
      }),
    []
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
      icon: <Tag className="size-4" />,
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

  // Handle bulk delete
  const handleBulkDelete = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    const selectedIds = selectedCustomers.map((c) => c.id)
    setCustomers((prev) => prev.filter((c) => !selectedIds.includes(c.id)))
    setSelectedCustomers([])
  }

  // Handle add customer button click
  const handleAddCustomer = () => {
    setEditingCustomer(undefined)
    setFormDialogOpen(true)
  }

  // Handle form submission for both create and edit
  const handleFormSubmit = async (data: CustomerFormData) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500))

    const selectedTags = availableTags.filter((tag) => data.tagIds.includes(tag.id))

    if (editingCustomer) {
      // Update existing customer
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === editingCustomer.id
            ? {
                ...c,
                name: data.name,
                whatsappNumber: data.whatsappNumber,
                tags: selectedTags,
                updatedAt: new Date(),
              }
            : c
        )
      )
    } else {
      // Create new customer
      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        name: data.name,
        whatsappNumber: data.whatsappNumber,
        tags: selectedTags,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setCustomers((prev) => [newCustomer, ...prev])
    }
  }

  // Custom toolbar with advanced filters
  const renderToolbar = () => (
    <div className="space-y-4">
      <CustomerFilters
        filters={filters}
        onFiltersChange={setFilters}
        availableTags={availableTags}
      />
    </div>
  )

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
        isLoading={isLoading}
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
        availableTags={availableTags}
        onSubmit={handleFormSubmit}
      />
    </div>
  )
}
