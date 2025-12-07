import * as React from "react"
import {
  Download,
  FileSpreadsheet,
  Loader2,
  Pause,
  Plus,
  Radio,
  Trash2,
  X,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

import { DataTable, type BulkAction } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { exportToCSV, exportToExcel } from "@/lib/export-utils"
import {
  broadcastService,
  type Broadcast as ApiBroadcast,
  type CreateBroadcastData,
  type UpdateBroadcastData,
  RecipientType as ApiRecipientType,
  type TemplateVariablesConfig as ApiTemplateVariablesConfig,
} from "@/services/broadcast.service"
import {
  templateService,
  type WhatsAppTemplate as ApiWhatsAppTemplate,
} from "@/services/template.service"
import { groupService, type CustomerGroup } from "@/services/group.service"
import { customerService, type Customer as ApiCustomer } from "@/services/customer.service"
import type { WhatsAppTemplate } from "@/pages/whatsapp-templates/types"
import type { Customer } from "@/pages/customers/types"
import type { Broadcast, BroadcastFilters as BroadcastFiltersType, BroadcastFormData } from "./types"
import { defaultFilters } from "./types"
import { getBroadcastColumns } from "./components/BroadcastTable"
import { BroadcastFilters } from "./components/BroadcastFilters"
import { BroadcastFormDialog } from "./components/BroadcastFormDialog"

// Static timezone data (no API needed)
const TIMEZONES = [
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Jakarta", label: "Indonesia (WIB)" },
  { value: "America/New_York", label: "New York (EST)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "UTC", label: "UTC" },
]

// Transform API broadcast to local Broadcast type
function transformApiBroadcast(apiBroadcast: ApiBroadcast): Broadcast {
  return {
    id: apiBroadcast.id,
    name: apiBroadcast.name,
    description: apiBroadcast.description ?? undefined,
    templateId: apiBroadcast.templateId,
    templateName: apiBroadcast.templateName,
    templateCategory: apiBroadcast.templateCategory.toUpperCase() as Broadcast["templateCategory"],
    recipientType: apiBroadcast.recipientType.toUpperCase() as Broadcast["recipientType"],
    groupId: apiBroadcast.groupId ?? undefined,
    groupName: undefined, // Not returned by API, could be fetched separately if needed
    customerIds: apiBroadcast.customerIds ?? undefined,
    totalRecipients: apiBroadcast.totalRecipients,
    scheduledAt: apiBroadcast.scheduledAt ? new Date(apiBroadcast.scheduledAt) : null,
    isImmediate: apiBroadcast.isImmediate,
    timezone: apiBroadcast.timezone,
    status: apiBroadcast.status.toUpperCase() as Broadcast["status"],
    sentCount: apiBroadcast.sentCount,
    deliveredCount: apiBroadcast.deliveredCount,
    readCount: apiBroadcast.readCount,
    failedCount: apiBroadcast.failedCount,
    createdBy: apiBroadcast.createdBy,
    createdAt: new Date(apiBroadcast.createdAt),
    updatedAt: new Date(apiBroadcast.updatedAt),
    completedAt: apiBroadcast.completedAt ? new Date(apiBroadcast.completedAt) : undefined,
  }
}

// Transform local form template variables to API format
function transformTemplateVariablesToApi(
  vars: BroadcastFormData["templateVariables"]
): ApiTemplateVariablesConfig {
  if (!vars) {
    return { bodyVariables: [], buttonVariables: [] }
  }

  return {
    header: vars.header
      ? {
          type: vars.header.type.toLowerCase() as "text" | "image" | "video" | "document",
          textVariable: vars.header.textVariable
            ? {
                index: vars.header.textVariable.index,
                sourceType: vars.header.textVariable.sourceType.toLowerCase() as "static" | "customer_field",
                staticValue: vars.header.textVariable.staticValue,
                customerField: vars.header.textVariable.customerField,
              }
            : undefined,
          mediaUrl: vars.header.mediaUrl,
        }
      : undefined,
    bodyVariables: vars.bodyVariables.map((v) => ({
      index: v.index,
      sourceType: v.sourceType.toLowerCase() as "static" | "customer_field",
      staticValue: v.staticValue,
      customerField: v.customerField,
    })),
    buttonVariables: vars.buttonVariables.map((bv) => ({
      buttonIndex: bv.buttonIndex,
      variable: {
        index: bv.variable.index,
        sourceType: bv.variable.sourceType.toLowerCase() as "static" | "customer_field",
        staticValue: bv.variable.staticValue,
        customerField: bv.variable.customerField,
      },
    })),
  }
}

// Transform local form data to API create data
function transformFormDataToCreateData(data: BroadcastFormData): CreateBroadcastData {
  return {
    name: data.name,
    description: data.description || undefined,
    templateId: data.templateId,
    recipientType: data.recipientType.toLowerCase() as ApiRecipientType,
    groupId: data.recipientType === "GROUP" ? data.groupId : undefined,
    customerIds: data.recipientType === "CUSTOMERS" ? data.customerIds : undefined,
    templateVariables: transformTemplateVariablesToApi(data.templateVariables),
    scheduledAt: data.scheduledAt ? data.scheduledAt.toISOString() : undefined,
    isImmediate: data.isImmediate,
    timezone: data.timezone,
  }
}

// Transform local form data to API update data
function transformFormDataToUpdateData(data: BroadcastFormData): UpdateBroadcastData {
  return {
    name: data.name,
    description: data.description || undefined,
    templateId: data.templateId,
    recipientType: data.recipientType.toLowerCase() as ApiRecipientType,
    groupId: data.recipientType === "GROUP" ? data.groupId : undefined,
    customerIds: data.recipientType === "CUSTOMERS" ? data.customerIds : undefined,
    templateVariables: transformTemplateVariablesToApi(data.templateVariables),
    scheduledAt: data.scheduledAt ? data.scheduledAt.toISOString() : undefined,
    isImmediate: data.isImmediate,
    timezone: data.timezone,
  }
}

// Transform API template to format needed by form dialog (local WhatsAppTemplate type)
function transformTemplateForForm(template: ApiWhatsAppTemplate): WhatsAppTemplate {
  // Get the first translation for single-language backwards compatibility
  const firstTranslation = template.translations?.[0]

  return {
    id: template.id,
    name: template.name,
    category: template.category.toUpperCase() as WhatsAppTemplate["category"],
    status: (firstTranslation?.status?.toUpperCase() ?? "APPROVED") as WhatsAppTemplate["status"],
    quality: firstTranslation?.quality
      ? (firstTranslation.quality.toUpperCase() as WhatsAppTemplate["quality"])
      : undefined,
    language: firstTranslation?.language ?? "en",
    header: firstTranslation?.headerType
      ? {
          type: firstTranslation.headerType.toUpperCase() as WhatsAppTemplate["header"] extends { type: infer T } ? T : never,
          text: firstTranslation.headerContent ?? undefined,
        }
      : undefined,
    body: firstTranslation?.body ?? "",
    footer: firstTranslation?.footer ?? undefined,
    buttons: (firstTranslation?.buttons ?? []).map((btn) => ({
      id: btn.id,
      type: btn.type.toUpperCase() as "QUICK_REPLY" | "CALL" | "URL" | "COPY_CODE",
      text: btn.text,
      url: btn.url,
      phoneNumber: btn.phoneNumber,
    })),
    createdAt: new Date(template.createdAt),
    updatedAt: new Date(template.updatedAt),
    rejectionReason: firstTranslation?.rejectionReason ?? undefined,
  }
}

// Transform API group to format needed by form dialog
function transformGroupForForm(group: CustomerGroup) {
  return {
    id: group.id,
    name: group.name,
    count: group.memberCount ?? 0,
  }
}

// Transform API customer to local Customer type
function transformCustomerForForm(customer: ApiCustomer): Customer {
  return {
    id: customer.id,
    name: customer.name,
    whatsappNumber: customer.whatsappNumber,
    tags: customer.tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color as Customer["tags"][number]["color"],
    })),
    customFields: customer.customFields as Customer["customFields"],
    createdAt: new Date(customer.createdAt),
    updatedAt: new Date(customer.updatedAt),
  }
}

export function BroadcastsPage() {
  // Data state
  const [broadcasts, setBroadcasts] = React.useState<Broadcast[]>([])
  const [templates, setTemplates] = React.useState<ApiWhatsAppTemplate[]>([])
  const [groups, setGroups] = React.useState<CustomerGroup[]>([])
  const [customers, setCustomers] = React.useState<ApiCustomer[]>([])

  // UI state
  const [filters, setFilters] = React.useState<BroadcastFiltersType>(defaultFilters)
  const [selectedBroadcasts, setSelectedBroadcasts] = React.useState<Broadcast[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = React.useState(false)
  const [showBulkCancelDialog, setShowBulkCancelDialog] = React.useState(false)
  const [formDialogOpen, setFormDialogOpen] = React.useState(false)
  const [editingBroadcast, setEditingBroadcast] = React.useState<Broadcast | undefined>(undefined)

  // Fetch all required data on mount
  React.useEffect(() => {
    const controller = new AbortController()

    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const [broadcastsRes, templatesRes, groupsRes, customersRes] = await Promise.all([
          broadcastService.getBroadcasts({}),
          templateService.getApprovedTemplates(),
          groupService.getGroups({}),
          customerService.getCustomers({ limit: 100 }),
        ])

        if (!controller.signal.aborted) {
          setBroadcasts(broadcastsRes.data.map(transformApiBroadcast))
          setTemplates(templatesRes)
          setGroups(groupsRes.data)
          setCustomers(customersRes.data)
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          const message = err instanceof Error ? err.message : "Failed to load data"
          setError(message)
          toast.error("Failed to load broadcasts", { description: message })
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      controller.abort()
    }
  }, [])

  // Refetch broadcasts after mutations
  const refetchBroadcasts = React.useCallback(async () => {
    try {
      const broadcastsRes = await broadcastService.getBroadcasts({})
      setBroadcasts(broadcastsRes.data.map(transformApiBroadcast))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to refresh broadcasts"
      toast.error("Failed to refresh", { description: message })
    }
  }, [])

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

  // Action handlers using useCallback for stability
  const handleViewDetails = React.useCallback((broadcast: Broadcast) => {
    console.log("View details:", broadcast)
    // TODO: Open broadcast detail modal/page
  }, [])

  const handleEdit = React.useCallback((broadcast: Broadcast) => {
    setEditingBroadcast(broadcast)
    setFormDialogOpen(true)
  }, [])

  const handleSchedule = React.useCallback(
    async (broadcast: Broadcast) => {
      try {
        await broadcastService.schedule(broadcast.id)
        toast.success("Broadcast scheduled successfully")
        await refetchBroadcasts()
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to schedule broadcast"
        toast.error("Failed to schedule", { description: message })
      }
    },
    [refetchBroadcasts]
  )

  const handlePause = React.useCallback(
    async (broadcast: Broadcast) => {
      try {
        await broadcastService.pause(broadcast.id)
        toast.success("Broadcast paused")
        // Optimistic update
        setBroadcasts((prev) =>
          prev.map((b) =>
            b.id === broadcast.id
              ? { ...b, status: "PAUSED" as const, updatedAt: new Date() }
              : b
          )
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to pause broadcast"
        toast.error("Failed to pause", { description: message })
        await refetchBroadcasts()
      }
    },
    [refetchBroadcasts]
  )

  const handleResume = React.useCallback(
    async (broadcast: Broadcast) => {
      try {
        await broadcastService.resume(broadcast.id)
        toast.success("Broadcast resumed")
        // Optimistic update - API will return the actual new status
        const newStatus = broadcast.sentCount > 0 ? "SENDING" : "SCHEDULED"
        setBroadcasts((prev) =>
          prev.map((b) =>
            b.id === broadcast.id
              ? { ...b, status: newStatus as Broadcast["status"], updatedAt: new Date() }
              : b
          )
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to resume broadcast"
        toast.error("Failed to resume", { description: message })
        await refetchBroadcasts()
      }
    },
    [refetchBroadcasts]
  )

  const handleCancel = React.useCallback(
    async (broadcast: Broadcast) => {
      try {
        await broadcastService.cancel(broadcast.id)
        toast.success("Broadcast cancelled")
        // Optimistic update
        setBroadcasts((prev) =>
          prev.map((b) =>
            b.id === broadcast.id
              ? { ...b, status: "CANCELLED" as const, updatedAt: new Date() }
              : b
          )
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to cancel broadcast"
        toast.error("Failed to cancel", { description: message })
        await refetchBroadcasts()
      }
    },
    [refetchBroadcasts]
  )

  const handleRetry = React.useCallback(
    async (broadcast: Broadcast) => {
      try {
        await broadcastService.retry(broadcast.id)
        toast.success("Retrying failed recipients")
        // Optimistic update
        setBroadcasts((prev) =>
          prev.map((b) =>
            b.id === broadcast.id
              ? { ...b, status: "SENDING" as const, updatedAt: new Date() }
              : b
          )
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to retry broadcast"
        toast.error("Failed to retry", { description: message })
        await refetchBroadcasts()
      }
    },
    [refetchBroadcasts]
  )

  const handleDuplicate = React.useCallback(
    async (broadcast: Broadcast) => {
      // Create a new broadcast based on the existing one
      const duplicateData: CreateBroadcastData = {
        name: `${broadcast.name} (Copy)`,
        description: broadcast.description,
        templateId: broadcast.templateId,
        recipientType: broadcast.recipientType.toLowerCase() as ApiRecipientType,
        groupId: broadcast.groupId,
        customerIds: broadcast.customerIds,
        templateVariables: {
          bodyVariables: [],
          buttonVariables: [],
        },
        isImmediate: false,
        timezone: broadcast.timezone,
      }

      try {
        const newBroadcast = await broadcastService.createBroadcast(duplicateData)
        toast.success("Broadcast duplicated")
        setBroadcasts((prev) => [transformApiBroadcast(newBroadcast), ...prev])
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to duplicate broadcast"
        toast.error("Failed to duplicate", { description: message })
      }
    },
    []
  )

  const handleViewReport = React.useCallback((broadcast: Broadcast) => {
    console.log("View report:", broadcast)
    // TODO: Open report page/modal
  }, [])

  const handleDelete = React.useCallback(
    async (broadcast: Broadcast) => {
      try {
        await broadcastService.deleteBroadcast(broadcast.id)
        toast.success("Broadcast deleted")
        // Optimistic update
        setBroadcasts((prev) => prev.filter((b) => b.id !== broadcast.id))
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete broadcast"
        toast.error("Failed to delete", { description: message })
        await refetchBroadcasts()
      }
    },
    [refetchBroadcasts]
  )

  // Column definitions with action handlers
  const columns = React.useMemo(
    () =>
      getBroadcastColumns({
        onViewDetails: handleViewDetails,
        onEdit: handleEdit,
        onSchedule: handleSchedule,
        onPause: handlePause,
        onResume: handleResume,
        onCancel: handleCancel,
        onRetry: handleRetry,
        onDuplicate: handleDuplicate,
        onViewReport: handleViewReport,
        onDelete: handleDelete,
      }),
    [
      handleViewDetails,
      handleEdit,
      handleSchedule,
      handlePause,
      handleResume,
      handleCancel,
      handleRetry,
      handleDuplicate,
      handleViewReport,
      handleDelete,
    ]
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
      onClick: async (broadcastsToPause) => {
        const pausableIds = broadcastsToPause
          .filter((b) => b.status === "SCHEDULED" || b.status === "SENDING")
          .map((b) => b.id)

        if (pausableIds.length === 0) return

        try {
          await broadcastService.bulkPause(pausableIds)
          toast.success(`Paused ${pausableIds.length} broadcast(s)`)
          // Optimistic update
          setBroadcasts((prev) =>
            prev.map((b) =>
              pausableIds.includes(b.id)
                ? { ...b, status: "PAUSED" as const, updatedAt: new Date() }
                : b
            )
          )
          setSelectedBroadcasts([])
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to pause broadcasts"
          toast.error("Failed to pause broadcasts", { description: message })
          await refetchBroadcasts()
        }
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
  const handleAddBroadcast = React.useCallback(() => {
    setEditingBroadcast(undefined)
    setFormDialogOpen(true)
  }, [])

  // Handle form submission for both create and edit
  const handleFormSubmit = React.useCallback(
    async (data: BroadcastFormData) => {
      try {
        if (editingBroadcast) {
          // Update existing broadcast
          const updateData = transformFormDataToUpdateData(data)
          const updatedBroadcast = await broadcastService.updateBroadcast(
            editingBroadcast.id,
            updateData
          )
          toast.success("Broadcast updated")
          setBroadcasts((prev) =>
            prev.map((b) =>
              b.id === editingBroadcast.id ? transformApiBroadcast(updatedBroadcast) : b
            )
          )
        } else {
          // Create new broadcast
          const createData = transformFormDataToCreateData(data)
          const newBroadcast = await broadcastService.createBroadcast(createData)
          toast.success("Broadcast created")
          setBroadcasts((prev) => [transformApiBroadcast(newBroadcast), ...prev])
        }
        setFormDialogOpen(false)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save broadcast"
        toast.error("Failed to save broadcast", { description: message })
        throw err // Re-throw to keep dialog open on error
      }
    },
    [editingBroadcast]
  )

  // Handle bulk delete
  const handleBulkDelete = React.useCallback(async () => {
    const selectedIds = selectedBroadcasts.map((b) => b.id)

    try {
      await broadcastService.bulkDelete(selectedIds)
      toast.success(`Deleted ${selectedIds.length} broadcast(s)`)
      // Optimistic update
      setBroadcasts((prev) => prev.filter((b) => !selectedIds.includes(b.id)))
      setSelectedBroadcasts([])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete broadcasts"
      toast.error("Failed to delete broadcasts", { description: message })
      await refetchBroadcasts()
    }
  }, [selectedBroadcasts, refetchBroadcasts])

  // Handle bulk cancel
  const handleBulkCancel = React.useCallback(async () => {
    const cancellableIds = selectedBroadcasts
      .filter((b) => b.status === "SCHEDULED" || b.status === "PAUSED")
      .map((b) => b.id)

    if (cancellableIds.length === 0) return

    try {
      await broadcastService.bulkCancel(cancellableIds)
      toast.success(`Cancelled ${cancellableIds.length} broadcast(s)`)
      // Optimistic update
      setBroadcasts((prev) =>
        prev.map((b) =>
          cancellableIds.includes(b.id)
            ? { ...b, status: "CANCELLED" as const, updatedAt: new Date() }
            : b
        )
      )
      setSelectedBroadcasts([])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cancel broadcasts"
      toast.error("Failed to cancel broadcasts", { description: message })
      await refetchBroadcasts()
    }
  }, [selectedBroadcasts, refetchBroadcasts])

  // Custom toolbar with advanced filters
  const renderToolbar = React.useCallback(
    () => (
      <div className="space-y-4">
        <BroadcastFilters filters={filters} onFiltersChange={setFilters} />
      </div>
    ),
    [filters]
  )

  // Transform data for form dialog
  const availableTemplatesForForm = React.useMemo(
    () => templates.map(transformTemplateForForm),
    [templates]
  )

  const availableGroupsForForm = React.useMemo(
    () => groups.map(transformGroupForForm),
    [groups]
  )

  const availableCustomersForForm = React.useMemo(
    () => customers.map(transformCustomerForForm),
    [customers]
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading broadcasts...</p>
      </div>
    )
  }

  // Error state
  if (error && broadcasts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <Radio className="size-8 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
        <Button
          variant="outline"
          onClick={() => {
            setError(null)
            setIsLoading(true)
            broadcastService
              .getBroadcasts({})
              .then((res) => {
                setBroadcasts(res.data.map(transformApiBroadcast))
              })
              .catch((err) => {
                setError(err instanceof Error ? err.message : "Failed to load broadcasts")
              })
              .finally(() => {
                setIsLoading(false)
              })
          }}
        >
          Retry
        </Button>
      </div>
    )
  }

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
        availableTemplates={availableTemplatesForForm}
        availableGroups={availableGroupsForForm}
        availableCustomers={availableCustomersForForm}
        availableTimezones={TIMEZONES}
        onSubmit={handleFormSubmit}
      />
    </div>
  )
}
