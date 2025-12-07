import * as React from "react"
import { AlertCircle, FileText, Loader2, Plus, Wifi, WifiOff } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useTemplateStatusSSE, type TemplateStatusUpdate } from "@/hooks/useTemplateStatusSSE"
import {
  templateService,
  type WhatsAppTemplate as ApiWhatsAppTemplate,
  type TemplateTranslation as ApiTemplateTranslation,
  TemplateCategory as ApiTemplateCategory,
  TemplateStatus as ApiTemplateStatus,
  HeaderType as ApiHeaderType,
  ButtonType as ApiButtonType,
} from "@/services/template.service"
import type {
  WhatsAppTemplateGroup,
  TemplateTranslation,
  TemplateFilters as TemplateFiltersType,
  CreateTemplateFormData,
  AddTranslationFormData,
  EditTranslationFormData,
  TranslationFormData,
  TemplateStatus,
  TemplateCategory,
  HeaderType,
  ButtonType,
} from "./types"
import { defaultFilters, getAggregatedStatus, getLanguageLabel } from "./types"
import { TemplateFilters } from "./components/TemplateFilters"
import { TemplateGroupTable } from "./components/TemplateGroupTable"
import { CreateTemplateDialog } from "./components/CreateTemplateDialog"
import { AddTranslationDialog } from "./components/AddTranslationDialog"
import { EditTranslationDialog } from "./components/EditTranslationDialog"

// ============================================================================
// Type Transformations
// ============================================================================

/**
 * Maps API status enum to local uppercase status type
 */
function mapApiStatusToLocal(status: ApiTemplateStatus): TemplateStatus {
  const statusMap: Record<ApiTemplateStatus, TemplateStatus> = {
    [ApiTemplateStatus.APPROVED]: "APPROVED",
    [ApiTemplateStatus.PENDING]: "PENDING",
    [ApiTemplateStatus.REJECTED]: "REJECTED",
    [ApiTemplateStatus.DISABLED]: "REJECTED", // Map disabled to rejected for simplicity
    [ApiTemplateStatus.PAUSED]: "PENDING",
    [ApiTemplateStatus.PENDING_DELETION]: "PENDING",
    [ApiTemplateStatus.IN_APPEAL]: "PENDING",
    [ApiTemplateStatus.FLAGGED]: "REJECTED",
    [ApiTemplateStatus.LIMIT_EXCEEDED]: "REJECTED",
  }
  return statusMap[status] ?? "PENDING"
}

/**
 * Maps API category enum to local uppercase category type
 */
function mapApiCategoryToLocal(category: ApiTemplateCategory): TemplateCategory {
  const categoryMap: Record<ApiTemplateCategory, TemplateCategory> = {
    [ApiTemplateCategory.MARKETING]: "MARKETING",
    [ApiTemplateCategory.UTILITY]: "UTILITY",
    [ApiTemplateCategory.AUTHENTICATION]: "AUTHENTICATION",
  }
  return categoryMap[category]
}

/**
 * Maps local category to API category enum
 */
function mapLocalCategoryToApi(category: TemplateCategory): ApiTemplateCategory {
  const categoryMap: Record<TemplateCategory, ApiTemplateCategory> = {
    MARKETING: ApiTemplateCategory.MARKETING,
    UTILITY: ApiTemplateCategory.UTILITY,
    AUTHENTICATION: ApiTemplateCategory.AUTHENTICATION,
  }
  return categoryMap[category]
}

/**
 * Maps API header type to local header type
 */
function mapApiHeaderTypeToLocal(headerType: ApiHeaderType | null): HeaderType {
  if (!headerType) return "NONE"
  const headerMap: Record<ApiHeaderType, HeaderType> = {
    [ApiHeaderType.TEXT]: "TEXT",
    [ApiHeaderType.IMAGE]: "IMAGE",
    [ApiHeaderType.VIDEO]: "VIDEO",
    [ApiHeaderType.DOCUMENT]: "DOCUMENT",
    [ApiHeaderType.NONE]: "NONE",
  }
  return headerMap[headerType]
}

/**
 * Maps local header type to API header type
 */
function mapLocalHeaderTypeToApi(headerType: HeaderType): ApiHeaderType {
  const headerMap: Record<HeaderType, ApiHeaderType> = {
    TEXT: ApiHeaderType.TEXT,
    IMAGE: ApiHeaderType.IMAGE,
    VIDEO: ApiHeaderType.VIDEO,
    DOCUMENT: ApiHeaderType.DOCUMENT,
    NONE: ApiHeaderType.NONE,
  }
  return headerMap[headerType]
}

/**
 * Maps API button type to local button type
 */
function mapApiButtonTypeToLocal(buttonType: ApiButtonType): ButtonType {
  const buttonMap: Record<ApiButtonType, ButtonType> = {
    [ApiButtonType.QUICK_REPLY]: "QUICK_REPLY",
    [ApiButtonType.CALL]: "CALL",
    [ApiButtonType.URL]: "URL",
    [ApiButtonType.COPY_CODE]: "COPY_CODE",
  }
  return buttonMap[buttonType]
}

/**
 * Maps local button type to API button type
 */
function mapLocalButtonTypeToApi(buttonType: ButtonType): ApiButtonType {
  const buttonMap: Record<ButtonType, ApiButtonType> = {
    QUICK_REPLY: ApiButtonType.QUICK_REPLY,
    CALL: ApiButtonType.CALL,
    URL: ApiButtonType.URL,
    COPY_CODE: ApiButtonType.COPY_CODE,
  }
  return buttonMap[buttonType]
}

/**
 * Transforms API translation to local TemplateTranslation type
 */
function transformTranslation(apiTranslation: ApiTemplateTranslation): TemplateTranslation {
  return {
    id: apiTranslation.id,
    language: apiTranslation.language,
    status: mapApiStatusToLocal(apiTranslation.status),
    quality: apiTranslation.quality
      ? (apiTranslation.quality.toUpperCase() as TemplateTranslation["quality"])
      : undefined,
    header:
      apiTranslation.headerType && apiTranslation.headerType !== ApiHeaderType.NONE
        ? {
            type: mapApiHeaderTypeToLocal(apiTranslation.headerType),
            text:
              apiTranslation.headerType === ApiHeaderType.TEXT
                ? apiTranslation.headerContent ?? undefined
                : undefined,
            mediaUrl:
              apiTranslation.headerType !== ApiHeaderType.TEXT
                ? apiTranslation.headerContent ?? undefined
                : undefined,
          }
        : undefined,
    body: apiTranslation.body,
    footer: apiTranslation.footer ?? undefined,
    buttons: apiTranslation.buttons.map((btn) => ({
      id: btn.id,
      type: mapApiButtonTypeToLocal(btn.type),
      text: btn.text,
      url: btn.url,
      phoneNumber: btn.phoneNumber,
    })),
    rejectionReason: apiTranslation.rejectionReason ?? undefined,
    createdAt: new Date(apiTranslation.createdAt),
    updatedAt: new Date(apiTranslation.updatedAt),
  }
}

/**
 * Transforms API template to local WhatsAppTemplateGroup type
 */
function transformTemplate(apiTemplate: ApiWhatsAppTemplate): WhatsAppTemplateGroup {
  return {
    id: apiTemplate.id,
    name: apiTemplate.name,
    category: mapApiCategoryToLocal(apiTemplate.category),
    translations: apiTemplate.translations.map(transformTranslation),
    customFields: apiTemplate.customFields,
    createdAt: new Date(apiTemplate.createdAt),
    updatedAt: new Date(apiTemplate.updatedAt),
  }
}

// Helper to generate unique IDs for local operations
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

// Dialog state types
interface AddTranslationDialogState {
  open: boolean
  templateGroup: WhatsAppTemplateGroup | null
  initialTranslation?: Partial<TranslationFormData>
}

interface EditTranslationDialogState {
  open: boolean
  templateGroup: WhatsAppTemplateGroup | null
  translation: TemplateTranslation | null
}

export function WhatsAppTemplatesPage() {
  const [templateGroups, setTemplateGroups] = React.useState<WhatsAppTemplateGroup[]>([])
  const [filters, setFilters] = React.useState<TemplateFiltersType>(defaultFilters)
  const [_selectedGroups, setSelectedGroups] = React.useState<WhatsAppTemplateGroup[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [addTranslationDialog, setAddTranslationDialog] =
    React.useState<AddTranslationDialogState>({
      open: false,
      templateGroup: null,
    })
  const [editTranslationDialog, setEditTranslationDialog] =
    React.useState<EditTranslationDialogState>({
      open: false,
      templateGroup: null,
      translation: null,
    })

  // Fetch templates on mount
  React.useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await templateService.getTemplates({})
        setTemplateGroups(response.data.map(transformTemplate))
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load templates"
        setError(message)
        toast.error("Failed to load templates", { description: message })
      } finally {
        setIsLoading(false)
      }
    }
    fetchTemplates()
  }, [])

  // SSE subscription for real-time template status updates
  const handleTemplateStatusChange = React.useCallback(
    (update: TemplateStatusUpdate) => {
      const { templateName, language, oldStatus, newStatus, reason } = update

      // Update local state to reflect the new status
      setTemplateGroups((prev) =>
        prev.map((group) => {
          if (group.name !== templateName) return group

          return {
            ...group,
            translations: group.translations.map((t) => {
              if (t.language !== language) return t

              return {
                ...t,
                status: newStatus as TemplateStatus,
                rejectionReason: newStatus === "REJECTED" ? reason : undefined,
                updatedAt: new Date(),
              }
            }),
            updatedAt: new Date(),
          }
        })
      )

      // Show toast notification based on new status
      const languageLabel = getLanguageLabel(language)
      if (newStatus === "APPROVED") {
        toast.success(`Template "${templateName}" (${languageLabel}) approved`, {
          description: `Status changed from ${oldStatus} to ${newStatus}`,
        })
      } else if (newStatus === "REJECTED") {
        toast.error(`Template "${templateName}" (${languageLabel}) rejected`, {
          description: reason || `Status changed from ${oldStatus} to ${newStatus}`,
        })
      } else {
        toast.info(`Template "${templateName}" (${languageLabel}) status updated`, {
          description: `Status changed from ${oldStatus} to ${newStatus}`,
        })
      }
    },
    []
  )

  const { isConnected: sseConnected } = useTemplateStatusSSE(handleTemplateStatusChange)

  // Filter template groups based on current filters (using "any match" logic)
  const filteredGroups = React.useMemo(() => {
    return templateGroups.filter((group) => {
      // Search filter: match name or any translation body
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesName = group.name.toLowerCase().includes(searchLower)
        const matchesBody = group.translations.some((t) =>
          t.body.toLowerCase().includes(searchLower)
        )
        if (!matchesName && !matchesBody) return false
      }

      // Category filter
      if (filters.categories.length > 0) {
        if (!filters.categories.includes(group.category)) return false
      }

      // Status filter: show if ANY translation matches
      if (filters.statuses.length > 0) {
        const hasMatchingStatus = group.translations.some((t) =>
          filters.statuses.includes(t.status)
        )
        if (!hasMatchingStatus) return false
      }

      // Language filter: show if template has translation in selected language
      if (filters.languages.length > 0) {
        const hasMatchingLanguage = group.translations.some((t) =>
          filters.languages.includes(t.language)
        )
        if (!hasMatchingLanguage) return false
      }

      // Aggregated status filter
      if (filters.aggregatedStatuses.length > 0) {
        const aggStatus = getAggregatedStatus(group.translations)
        if (!filters.aggregatedStatuses.includes(aggStatus)) return false
      }

      // Date range filter
      if (filters.dateRange.from && group.updatedAt < filters.dateRange.from) {
        return false
      }
      if (filters.dateRange.to && group.updatedAt > filters.dateRange.to) {
        return false
      }

      return true
    })
  }, [templateGroups, filters])

  // Template group actions (memoized to prevent unnecessary re-renders)
  const handleAddTranslation = React.useCallback(
    (group: WhatsAppTemplateGroup) => {
      setAddTranslationDialog({
        open: true,
        templateGroup: group,
      })
    },
    []
  )

  const handleExportGroup = React.useCallback(
    (group: WhatsAppTemplateGroup) => {
      console.log("Export group:", group.name)
      // TODO: Export all translations
    },
    []
  )

  const handleDeleteGroup = React.useCallback(
    async (group: WhatsAppTemplateGroup) => {
      try {
        await templateService.deleteTemplate(group.id)
        setTemplateGroups((prev) => prev.filter((g) => g.id !== group.id))
        toast.success("Template deleted", {
          description: `Template "${group.name}" has been removed.`,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete template"
        toast.error("Delete failed", { description: message })
      }
    },
    []
  )

  // Translation actions (memoized)
  const handleViewTranslation = React.useCallback(
    (group: WhatsAppTemplateGroup, translation: TemplateTranslation) => {
      // Open edit dialog in read-only mode (for approved translations)
      setEditTranslationDialog({
        open: true,
        templateGroup: group,
        translation,
      })
    },
    []
  )

  const handleEditTranslation = React.useCallback(
    (group: WhatsAppTemplateGroup, translation: TemplateTranslation) => {
      setEditTranslationDialog({
        open: true,
        templateGroup: group,
        translation,
      })
    },
    []
  )

  const handleDuplicateTranslation = React.useCallback(
    (group: WhatsAppTemplateGroup, translation: TemplateTranslation) => {
      // Open add translation dialog with pre-filled content from existing translation
      setAddTranslationDialog({
        open: true,
        templateGroup: group,
        initialTranslation: {
          // Don't copy language - user needs to select new language
          headerType: translation.header?.type ?? "NONE",
          headerText: translation.header?.text ?? "",
          headerMediaUrl: translation.header?.mediaUrl ?? "",
          body: translation.body,
          footer: translation.footer ?? "",
          buttons: translation.buttons.map((btn) => ({
            id: generateId(),
            type: btn.type,
            text: btn.text,
            url: btn.url ?? "",
            phoneNumber: btn.phoneNumber ?? "",
          })),
        },
      })
    },
    []
  )

  const handleSendTestTranslation = React.useCallback(
    (group: WhatsAppTemplateGroup, translation: TemplateTranslation) => {
      console.log(
        "Send test for:",
        group.name,
        getLanguageLabel(translation.language)
      )
      // TODO: Open send test dialog
    },
    []
  )

  const handleUseBroadcastTranslation = React.useCallback(
    (group: WhatsAppTemplateGroup, translation: TemplateTranslation) => {
      console.log("Use in broadcast:", group.name, translation.language)
      // TODO: Navigate to broadcast creation
    },
    []
  )

  const handleSubmitApprovalTranslation = React.useCallback(
    (group: WhatsAppTemplateGroup, translation: TemplateTranslation) => {
      console.log("Submit for approval:", group.name, translation.language)
      // Update translation status to pending
      setTemplateGroups((prev) =>
        prev.map((g) =>
          g.id === group.id
            ? {
                ...g,
                translations: g.translations.map((t) =>
                  t.id === translation.id
                    ? {
                        ...t,
                        status: "PENDING" as const,
                        rejectionReason: undefined,
                        updatedAt: new Date(),
                      }
                    : t
                ),
                updatedAt: new Date(),
              }
            : g
        )
      )
    },
    []
  )

  const handleDeleteTranslation = React.useCallback(
    async (group: WhatsAppTemplateGroup, translation: TemplateTranslation) => {
      try {
        await templateService.deleteTranslation(group.id, translation.id)

        setTemplateGroups((prev) => {
          // If this is the last translation, remove the entire group
          if (group.translations.length === 1) {
            return prev.filter((g) => g.id !== group.id)
          }

          // Otherwise, just remove the translation
          return prev.map((g) =>
            g.id === group.id
              ? {
                  ...g,
                  translations: g.translations.filter((t) => t.id !== translation.id),
                  updatedAt: new Date(),
                }
              : g
          )
        })

        const languageLabel = getLanguageLabel(translation.language)
        toast.success("Translation deleted", {
          description: `${languageLabel} translation has been removed.`,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete translation"
        toast.error("Delete failed", { description: message })
      }
    },
    []
  )

  const handleCreateTemplate = React.useCallback(() => {
    setCreateDialogOpen(true)
  }, [])

  // Dialog submission handlers
  const handleCreateTemplateSubmit = React.useCallback(
    async (data: CreateTemplateFormData) => {
      try {
        // First, create the template
        const createdTemplate = await templateService.createTemplate({
          name: data.name,
          category: mapLocalCategoryToApi(data.category),
        })

        // Then, add the first translation
        const translationData = data.translation
        await templateService.addTranslation(createdTemplate.id, {
          language: translationData.language,
          headerType: mapLocalHeaderTypeToApi(translationData.headerType),
          headerContent:
            translationData.headerType === "TEXT"
              ? translationData.headerText
              : translationData.headerType !== "NONE"
                ? translationData.headerMediaUrl
                : undefined,
          body: translationData.body,
          footer: translationData.footer || undefined,
          buttons: translationData.buttons.map((btn) => ({
            type: mapLocalButtonTypeToApi(btn.type),
            text: btn.text,
            url: btn.type === "URL" ? btn.url : undefined,
            phoneNumber: btn.type === "CALL" ? btn.phoneNumber : undefined,
          })),
        })

        // Fetch the complete template with translations
        const completeTemplate = await templateService.getTemplate(createdTemplate.id)
        const transformedGroup = transformTemplate(completeTemplate)

        setTemplateGroups((prev) => [transformedGroup, ...prev])
        toast.success("Template created", {
          description: `Template "${data.name}" has been created.`,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create template"
        toast.error("Create failed", { description: message })
        throw err // Re-throw to keep dialog open on error
      }
    },
    []
  )

  const handleAddTranslationSubmit = React.useCallback(
    async (data: AddTranslationFormData) => {
      try {
        const translationData = data.translation
        const createdTranslation = await templateService.addTranslation(data.templateId, {
          language: translationData.language,
          headerType: mapLocalHeaderTypeToApi(translationData.headerType),
          headerContent:
            translationData.headerType === "TEXT"
              ? translationData.headerText
              : translationData.headerType !== "NONE"
                ? translationData.headerMediaUrl
                : undefined,
          body: translationData.body,
          footer: translationData.footer || undefined,
          buttons: translationData.buttons.map((btn) => ({
            type: mapLocalButtonTypeToApi(btn.type),
            text: btn.text,
            url: btn.type === "URL" ? btn.url : undefined,
            phoneNumber: btn.type === "CALL" ? btn.phoneNumber : undefined,
          })),
        })

        const newTranslation = transformTranslation(createdTranslation)

        setTemplateGroups((prev) =>
          prev.map((g) =>
            g.id === data.templateId
              ? {
                  ...g,
                  translations: [...g.translations, newTranslation],
                  updatedAt: new Date(),
                }
              : g
          )
        )

        const languageLabel = getLanguageLabel(translationData.language)
        toast.success("Translation added", {
          description: `${languageLabel} translation has been added.`,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add translation"
        toast.error("Add translation failed", { description: message })
        throw err // Re-throw to keep dialog open on error
      }
    },
    []
  )

  const handleEditTranslationSubmit = React.useCallback(
    async (data: EditTranslationFormData) => {
      try {
        // Find the template group that contains this translation
        const templateGroup = templateGroups.find((g) =>
          g.translations.some((t) => t.id === data.translationId)
        )

        if (!templateGroup) {
          throw new Error("Template not found")
        }

        const translationData = data.translation
        const updatedTranslation = await templateService.updateTranslation(
          templateGroup.id,
          data.translationId,
          {
            headerType: mapLocalHeaderTypeToApi(translationData.headerType),
            headerContent:
              translationData.headerType === "TEXT"
                ? translationData.headerText
                : translationData.headerType !== "NONE"
                  ? translationData.headerMediaUrl
                  : undefined,
            body: translationData.body,
            footer: translationData.footer || undefined,
            buttons: translationData.buttons.map((btn) => ({
              type: mapLocalButtonTypeToApi(btn.type),
              text: btn.text,
              url: btn.type === "URL" ? btn.url : undefined,
              phoneNumber: btn.type === "CALL" ? btn.phoneNumber : undefined,
            })),
          }
        )

        const transformedTranslation = transformTranslation(updatedTranslation)

        setTemplateGroups((prev) =>
          prev.map((g) =>
            g.id === templateGroup.id
              ? {
                  ...g,
                  translations: g.translations.map((t) =>
                    t.id === data.translationId ? transformedTranslation : t
                  ),
                  updatedAt: new Date(),
                }
              : g
          )
        )

        const languageLabel = getLanguageLabel(translationData.language)
        toast.success("Translation updated", {
          description: `${languageLabel} translation has been updated.`,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update translation"
        toast.error("Update failed", { description: message })
        throw err // Re-throw to keep dialog open on error
      }
    },
    [templateGroups]
  )

  // Dialog open change handlers
  const handleAddTranslationDialogChange = React.useCallback((open: boolean) => {
    if (!open) {
      setAddTranslationDialog({
        open: false,
        templateGroup: null,
      })
    }
  }, [])

  const handleEditTranslationDialogChange = React.useCallback((open: boolean) => {
    if (!open) {
      setEditTranslationDialog({
        open: false,
        templateGroup: null,
        translation: null,
      })
    }
  }, [])

  // Show error state
  if (error && !isLoading && templateGroups.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              WhatsApp Templates
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your WhatsApp message templates with multiple language
              translations.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <AlertCircle className="size-12 text-destructive" />
          <h3 className="mt-4 text-lg font-semibold">Failed to load templates</h3>
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
            <h1 className="text-2xl font-semibold text-foreground">
              WhatsApp Templates
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your WhatsApp message templates with multiple language
              translations.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Loader2 className="size-12 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">
              WhatsApp Templates
            </h1>
            {/* SSE Connection Status Indicator */}
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
              title={sseConnected ? "Real-time updates active" : "Real-time updates disconnected"}
            >
              {sseConnected ? (
                <>
                  <Wifi className="size-3 text-emerald-500" />
                  <span className="text-emerald-600">Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="size-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Offline</span>
                </>
              )}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your WhatsApp message templates with multiple language
            translations.
          </p>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="mr-2 size-4" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <TemplateFilters filters={filters} onFiltersChange={setFilters} />

      {/* Template Groups Table */}
      {filteredGroups.length > 0 ? (
        <TemplateGroupTable
          data={filteredGroups}
          isLoading={false}
          onAddTranslation={handleAddTranslation}
          onExportGroup={handleExportGroup}
          onDeleteGroup={handleDeleteGroup}
          onViewTranslation={handleViewTranslation}
          onEditTranslation={handleEditTranslation}
          onDuplicateTranslation={handleDuplicateTranslation}
          onSendTestTranslation={handleSendTestTranslation}
          onUseBroadcastTranslation={handleUseBroadcastTranslation}
          onSubmitApprovalTranslation={handleSubmitApprovalTranslation}
          onDeleteTranslation={handleDeleteTranslation}
          onSelectionChange={setSelectedGroups}
        />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <FileText className="size-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No templates found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started by creating your first WhatsApp template or adjust your
            filters.
          </p>
          <Button onClick={handleCreateTemplate} className="mt-4">
            <Plus className="mr-2 size-4" />
            Create Template
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <CreateTemplateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateTemplateSubmit}
      />

      <AddTranslationDialog
        open={addTranslationDialog.open}
        onOpenChange={handleAddTranslationDialogChange}
        templateGroup={addTranslationDialog.templateGroup}
        initialTranslation={addTranslationDialog.initialTranslation}
        onSubmit={handleAddTranslationSubmit}
      />

      <EditTranslationDialog
        open={editTranslationDialog.open}
        onOpenChange={handleEditTranslationDialogChange}
        templateGroup={editTranslationDialog.templateGroup}
        translation={editTranslationDialog.translation}
        onSubmit={handleEditTranslationSubmit}
      />
    </div>
  )
}
