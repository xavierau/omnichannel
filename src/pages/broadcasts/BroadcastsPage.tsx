import * as React from "react"
import {
  Download,
  FileSpreadsheet,
  Pause,
  Plus,
  Radio,
  Trash2,
  X,
} from "lucide-react"
import { format } from "date-fns"

import { DataTable, type BulkAction } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { exportToCSV, exportToExcel } from "@/lib/export-utils"
import type { Customer } from "@/pages/customers/types"
import { mockTemplates } from "@/pages/whatsapp-templates/data/mock-templates"
import type { Broadcast, BroadcastFilters as BroadcastFiltersType, BroadcastFormData } from "./types"
import { defaultFilters } from "./types"
import {
  mockBroadcasts,
  availableGroups,
  availableCustomers as mockAvailableCustomers,
  availableTimezones,
} from "./data/mock-broadcasts"
import { getBroadcastColumns } from "./components/BroadcastTable"
import { BroadcastFilters } from "./components/BroadcastFilters"
import { BroadcastFormDialog } from "./components/BroadcastFormDialog"

// Get only APPROVED templates for broadcast selection
const availableTemplates = mockTemplates.filter((t) => t.status === "APPROVED")

// Convert simplified customers to full Customer type for the form
const availableCustomers: Customer[] = mockAvailableCustomers.map((c) => ({
  ...c,
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
}))

export function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = React.useState<Broadcast[]>(mockBroadcasts)
  const [filters, setFilters] = React.useState<BroadcastFiltersType>(defaultFilters)
  const [selectedBroadcasts, setSelectedBroadcasts] = React.useState<Broadcast[]>([])
  const [isLoading] = React.useState(false)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = React.useState(false)
  const [showBulkCancelDialog, setShowBulkCancelDialog] = React.useState(false)
  const [formDialogOpen, setFormDialogOpen] = React.useState(false)
  const [editingBroadcast, setEditingBroadcast] = React.useState<Broadcast | undefined>(undefined)

  // Filter broadcasts based on current filters
  const filteredBroadcasts = React.useMemo(() => {
    return broadcasts.filter((broadcast) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesName = broadcast.name.toLowerCase().includes(searchLower)
        const matchesDescription = broadcast.description?.toLowerCase().includes(searchLower)
        const matchesTemplate = broadcast.templateName.toLowerCase().includes(searchLower)
        if (!matchesName && !matchesDescription && !matchesTemplate) return false
      }

      // Status filter
      if (filters.statuses.length > 0) {
        if (!filters.statuses.includes(broadcast.status)) return false
      }

      // Template category filter
      if (filters.templateCategories.length > 0) {
        if (!filters.templateCategories.includes(broadcast.templateCategory)) return false
      }

      // Date range filter (for scheduled date)
      if (filters.dateRange.from && broadcast.scheduledAt) {
        if (broadcast.scheduledAt < filters.dateRange.from) return false
      }
      if (filters.dateRange.to && broadcast.scheduledAt) {
        if (broadcast.scheduledAt > filters.dateRange.to) return false
      }

      return true
    })
  }, [broadcasts, filters])

  // Column definitions with action handlers
  const columns = React.useMemo(
    () =>
      getBroadcastColumns({
        onViewDetails: (broadcast) => {
          console.log("View details:", broadcast)
          // TODO: Open broadcast detail modal/page
        },
        onEdit: (broadcast) => {
          setEditingBroadcast(broadcast)
          setFormDialogOpen(true)
        },
        onSchedule: (broadcast) => {
          console.log("Schedule broadcast:", broadcast)
          // TODO: Open scheduling dialog
        },
        onPause: (broadcast) => {
          setBroadcasts((prev) =>
            prev.map((b) =>
              b.id === broadcast.id
                ? { ...b, status: "PAUSED", updatedAt: new Date() }
                : b
            )
          )
        },
        onResume: (broadcast) => {
          // Resume to SCHEDULED or SENDING based on previous state
          const newStatus = broadcast.sentCount > 0 ? "SENDING" : "SCHEDULED"
          setBroadcasts((prev) =>
            prev.map((b) =>
              b.id === broadcast.id
                ? { ...b, status: newStatus, updatedAt: new Date() }
                : b
            )
          )
        },
        onCancel: async (broadcast) => {
          await new Promise((resolve) => setTimeout(resolve, 500))
          setBroadcasts((prev) =>
            prev.map((b) =>
              b.id === broadcast.id
                ? { ...b, status: "CANCELLED", updatedAt: new Date() }
                : b
            )
          )
        },
        onRetry: (broadcast) => {
          console.log("Retry broadcast:", broadcast)
          setBroadcasts((prev) =>
            prev.map((b) =>
              b.id === broadcast.id
                ? { ...b, status: "SENDING", updatedAt: new Date() }
                : b
            )
          )
        },
        onDuplicate: (broadcast) => {
          const duplicated: Broadcast = {
            ...broadcast,
            id: `brd_${Date.now()}`,
            name: `${broadcast.name} (Copy)`,
            status: "DRAFT",
            sentCount: 0,
            deliveredCount: 0,
            readCount: 0,
            failedCount: 0,
            scheduledAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            completedAt: undefined,
          }
          setBroadcasts((prev) => [duplicated, ...prev])
        },
        onViewReport: (broadcast) => {
          console.log("View report:", broadcast)
          // TODO: Open report page/modal
        },
        onDelete: async (broadcast) => {
          await new Promise((resolve) => setTimeout(resolve, 500))
          setBroadcasts((prev) => prev.filter((b) => b.id !== broadcast.id))
        },
      }),
    []
  )

  // Check if any selected broadcasts can be paused or cancelled
  const canPauseSelected = selectedBroadcasts.some(
    (b) => b.status === "SCHEDULED" || b.status === "SENDING"
  )
  const canCancelSelected = selectedBroadcasts.some(
    (b) => b.status === "SCHEDULED" || b.status === "PAUSED"
  )
  const canDeleteSelected = selectedBroadcasts.every(
    (b) => b.status === "DRAFT" || b.status === "COMPLETED" || b.status === "CANCELLED" || b.status === "FAILED"
  )

  // Bulk actions
  const bulkActions: BulkAction<Broadcast>[] = [
    {
      id: "delete",
      label: "Delete",
      icon: <Trash2 className="size-4" />,
      variant: "destructive",
      onClick: () => setShowBulkDeleteDialog(true),
      disabled: !canDeleteSelected,
    },
    {
      id: "export-csv",
      label: "CSV",
      icon: <Download className="size-4" />,
      onClick: (broadcasts) => {
        exportToCSV(
          broadcasts.map((b) => ({
            Name: b.name,
            Description: b.description || "",
            Template: b.templateName,
            Category: b.templateCategory,
            Recipients: b.totalRecipients,
            "Recipient Type": b.recipientType,
            "Group Name": b.groupName || "",
            Status: b.status,
            "Scheduled At": b.scheduledAt ? format(b.scheduledAt, "yyyy-MM-dd HH:mm") : "Immediate",
            Sent: b.sentCount,
            Delivered: b.deliveredCount,
            Read: b.readCount,
            Failed: b.failedCount,
            "Created At": format(b.createdAt, "yyyy-MM-dd HH:mm"),
            "Updated At": format(b.updatedAt, "yyyy-MM-dd HH:mm"),
          })),
          "broadcasts"
        )
      },
    },
    {
      id: "export-excel",
      label: "Excel",
      icon: <FileSpreadsheet className="size-4" />,
      onClick: (broadcasts) => {
        exportToExcel(
          broadcasts.map((b) => ({
            Name: b.name,
            Description: b.description || "",
            Template: b.templateName,
            Category: b.templateCategory,
            Recipients: b.totalRecipients,
            "Recipient Type": b.recipientType,
            "Group Name": b.groupName || "",
            Status: b.status,
            "Scheduled At": b.scheduledAt ? format(b.scheduledAt, "yyyy-MM-dd HH:mm") : "Immediate",
            Sent: b.sentCount,
            Delivered: b.deliveredCount,
            Read: b.readCount,
            Failed: b.failedCount,
            "Created At": format(b.createdAt, "yyyy-MM-dd HH:mm"),
            "Updated At": format(b.updatedAt, "yyyy-MM-dd HH:mm"),
          })),
          "broadcasts"
        )
      },
    },
    {
      id: "pause",
      label: "Pause",
      icon: <Pause className="size-4" />,
      onClick: (broadcasts) => {
        const pausableIds = broadcasts
          .filter((b) => b.status === "SCHEDULED" || b.status === "SENDING")
          .map((b) => b.id)
        setBroadcasts((prev) =>
          prev.map((b) =>
            pausableIds.includes(b.id)
              ? { ...b, status: "PAUSED", updatedAt: new Date() }
              : b
          )
        )
        setSelectedBroadcasts([])
      },
      disabled: !canPauseSelected,
    },
    {
      id: "cancel",
      label: "Cancel",
      icon: <X className="size-4" />,
      variant: "destructive",
      onClick: () => setShowBulkCancelDialog(true),
      disabled: !canCancelSelected,
    },
  ]

  // Handle add broadcast button click
  const handleAddBroadcast = () => {
    setEditingBroadcast(undefined)
    setFormDialogOpen(true)
  }

  // Handle form submission for both create and edit
  const handleFormSubmit = async (data: BroadcastFormData) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500))

    const selectedTemplate = availableTemplates.find((t) => t.id === data.templateId)
    const selectedGroup = availableGroups.find((g) => g.id === data.groupId)

    // Calculate total recipients
    const totalRecipients =
      data.recipientType === "GROUP"
        ? selectedGroup?.count ?? 0
        : data.customerIds.length

    if (editingBroadcast) {
      // Update existing broadcast
      setBroadcasts((prev) =>
        prev.map((b) =>
          b.id === editingBroadcast.id
            ? {
                ...b,
                name: data.name,
                description: data.description || undefined,
                templateId: data.templateId,
                templateName: selectedTemplate?.name ?? b.templateName,
                templateCategory: selectedTemplate?.category ?? b.templateCategory,
                recipientType: data.recipientType,
                groupId: data.recipientType === "GROUP" ? data.groupId : undefined,
                groupName: data.recipientType === "GROUP" ? selectedGroup?.name : undefined,
                customerIds: data.recipientType === "CUSTOMERS" ? data.customerIds : undefined,
                totalRecipients,
                isImmediate: data.isImmediate,
                scheduledAt: data.scheduledAt,
                timezone: data.timezone,
                updatedAt: new Date(),
              }
            : b
        )
      )
    } else {
      // Create new broadcast
      const newBroadcast: Broadcast = {
        id: `brd_${Date.now()}`,
        name: data.name,
        description: data.description || undefined,
        templateId: data.templateId,
        templateName: selectedTemplate?.name ?? "",
        templateCategory: selectedTemplate?.category ?? "MARKETING",
        recipientType: data.recipientType,
        groupId: data.recipientType === "GROUP" ? data.groupId : undefined,
        groupName: data.recipientType === "GROUP" ? selectedGroup?.name : undefined,
        customerIds: data.recipientType === "CUSTOMERS" ? data.customerIds : undefined,
        totalRecipients,
        isImmediate: data.isImmediate,
        scheduledAt: data.scheduledAt,
        timezone: data.timezone,
        status: "DRAFT",
        sentCount: 0,
        deliveredCount: 0,
        readCount: 0,
        failedCount: 0,
        createdBy: "current.user@company.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setBroadcasts((prev) => [newBroadcast, ...prev])
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    const selectedIds = selectedBroadcasts.map((b) => b.id)
    setBroadcasts((prev) => prev.filter((b) => !selectedIds.includes(b.id)))
    setSelectedBroadcasts([])
  }

  // Handle bulk cancel
  const handleBulkCancel = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    const cancellableIds = selectedBroadcasts
      .filter((b) => b.status === "SCHEDULED" || b.status === "PAUSED")
      .map((b) => b.id)
    setBroadcasts((prev) =>
      prev.map((b) =>
        cancellableIds.includes(b.id)
          ? { ...b, status: "CANCELLED", updatedAt: new Date() }
          : b
      )
    )
    setSelectedBroadcasts([])
  }

  // Custom toolbar with advanced filters
  const renderToolbar = () => (
    <div className="space-y-4">
      <BroadcastFilters filters={filters} onFiltersChange={setFilters} />
    </div>
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Broadcasts</h1>
          <p className="text-sm text-muted-foreground">
            Schedule and manage message broadcasts to your customers and groups.
          </p>
        </div>
        <Button onClick={handleAddBroadcast}>
          <Plus className="mr-2 size-4" />
          Create Broadcast
        </Button>
      </div>

      {/* Data Table with Filters */}
      <DataTable
        columns={columns}
        data={filteredBroadcasts}
        isLoading={isLoading}
        enableRowSelection
        onSelectionChange={setSelectedBroadcasts}
        bulkActions={bulkActions}
        searchPlaceholder="Search by name, description, or template..."
        emptyStateTitle="No broadcasts found"
        emptyStateDescription="Get started by creating your first broadcast or adjust your filters."
        emptyStateIcon={<Radio className="size-6 text-muted-foreground" />}
        renderToolbar={renderToolbar}
        pageSize={10}
        pageSizeOptions={[10, 20, 50, 100]}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        title="Delete Broadcasts"
        description={`Are you sure you want to delete ${selectedBroadcasts.length} broadcast(s)? This action cannot be undone.`}
        confirmText="Delete All"
        variant="destructive"
        onConfirm={handleBulkDelete}
      />

      {/* Bulk Cancel Confirmation */}
      <ConfirmDialog
        open={showBulkCancelDialog}
        onOpenChange={setShowBulkCancelDialog}
        title="Cancel Broadcasts"
        description={`Are you sure you want to cancel ${selectedBroadcasts.filter((b) => b.status === "SCHEDULED" || b.status === "PAUSED").length} broadcast(s)? Pending messages will not be sent.`}
        confirmText="Cancel Broadcasts"
        variant="destructive"
        onConfirm={handleBulkCancel}
      />

      {/* Broadcast Form Dialog */}
      <BroadcastFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        broadcast={editingBroadcast}
        availableTemplates={availableTemplates}
        availableGroups={availableGroups}
        availableCustomers={availableCustomers}
        availableTimezones={availableTimezones}
        onSubmit={handleFormSubmit}
      />
    </div>
  )
}
