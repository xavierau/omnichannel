import * as React from "react"
import { FileText, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import type {
  WhatsAppTemplateGroup,
  TemplateTranslation,
  TemplateFilters as TemplateFiltersType,
  CreateTemplateFormData,
  AddTranslationFormData,
  EditTranslationFormData,
  TranslationFormData,
} from "./types"
import { defaultFilters, getAggregatedStatus, getLanguageLabel } from "./types"
import { mockTemplateGroups } from "./data/mock-templates"
import { TemplateFilters } from "./components/TemplateFilters"
import { TemplateGroupTable } from "./components/TemplateGroupTable"
import { CreateTemplateDialog } from "./components/CreateTemplateDialog"
import { AddTranslationDialog } from "./components/AddTranslationDialog"
import { EditTranslationDialog } from "./components/EditTranslationDialog"

// Helper to generate unique IDs
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
  const [templateGroups, setTemplateGroups] =
    React.useState<WhatsAppTemplateGroup[]>(mockTemplateGroups)
  const [filters, setFilters] =
    React.useState<TemplateFiltersType>(defaultFilters)
  const [_selectedGroups, setSelectedGroups] = React.useState<
    WhatsAppTemplateGroup[]
  >([])
  const [isLoading] = React.useState(false)

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
      await new Promise((resolve) => setTimeout(resolve, 500))
      setTemplateGroups((prev) => prev.filter((g) => g.id !== group.id))
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
      await new Promise((resolve) => setTimeout(resolve, 500))

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
                translations: g.translations.filter(
                  (t) => t.id !== translation.id
                ),
                updatedAt: new Date(),
              }
            : g
        )
      })
    },
    []
  )

  const handleCreateTemplate = React.useCallback(() => {
    setCreateDialogOpen(true)
  }, [])

  // Dialog submission handlers
  const handleCreateTemplateSubmit = React.useCallback(
    async (data: CreateTemplateFormData) => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      const now = new Date()
      const newGroup: WhatsAppTemplateGroup = {
        id: generateId(),
        name: data.name,
        category: data.category,
        translations: [
          {
            id: generateId(),
            language: data.translation.language,
            status: "PENDING",
            header:
              data.translation.headerType !== "NONE"
                ? {
                    type: data.translation.headerType,
                    text:
                      data.translation.headerType === "TEXT"
                        ? data.translation.headerText
                        : undefined,
                    mediaUrl:
                      data.translation.headerType !== "TEXT"
                        ? data.translation.headerMediaUrl
                        : undefined,
                  }
                : undefined,
            body: data.translation.body,
            footer: data.translation.footer || undefined,
            buttons: data.translation.buttons.map((btn) => ({
              id: btn.id,
              type: btn.type,
              text: btn.text,
              url: btn.type === "URL" ? btn.url : undefined,
              phoneNumber: btn.type === "CALL" ? btn.phoneNumber : undefined,
            })),
            createdAt: now,
            updatedAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      }

      setTemplateGroups((prev) => [newGroup, ...prev])
    },
    []
  )

  const handleAddTranslationSubmit = React.useCallback(
    async (data: AddTranslationFormData) => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      const now = new Date()
      const newTranslation: TemplateTranslation = {
        id: generateId(),
        language: data.translation.language,
        status: "PENDING",
        header:
          data.translation.headerType !== "NONE"
            ? {
                type: data.translation.headerType,
                text:
                  data.translation.headerType === "TEXT"
                    ? data.translation.headerText
                    : undefined,
                mediaUrl:
                  data.translation.headerType !== "TEXT"
                    ? data.translation.headerMediaUrl
                    : undefined,
              }
            : undefined,
        body: data.translation.body,
        footer: data.translation.footer || undefined,
        buttons: data.translation.buttons.map((btn) => ({
          id: btn.id,
          type: btn.type,
          text: btn.text,
          url: btn.type === "URL" ? btn.url : undefined,
          phoneNumber: btn.type === "CALL" ? btn.phoneNumber : undefined,
        })),
        createdAt: now,
        updatedAt: now,
      }

      setTemplateGroups((prev) =>
        prev.map((g) =>
          g.id === data.templateId
            ? {
                ...g,
                translations: [...g.translations, newTranslation],
                updatedAt: now,
              }
            : g
        )
      )
    },
    []
  )

  const handleEditTranslationSubmit = React.useCallback(
    async (data: EditTranslationFormData) => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500))

      const now = new Date()

      setTemplateGroups((prev) =>
        prev.map((g) => ({
          ...g,
          translations: g.translations.map((t) =>
            t.id === data.translationId
              ? {
                  ...t,
                  header:
                    data.translation.headerType !== "NONE"
                      ? {
                          type: data.translation.headerType,
                          text:
                            data.translation.headerType === "TEXT"
                              ? data.translation.headerText
                              : undefined,
                          mediaUrl:
                            data.translation.headerType !== "TEXT"
                              ? data.translation.headerMediaUrl
                              : undefined,
                        }
                      : undefined,
                  body: data.translation.body,
                  footer: data.translation.footer || undefined,
                  buttons: data.translation.buttons.map((btn) => ({
                    id: btn.id,
                    type: btn.type,
                    text: btn.text,
                    url: btn.type === "URL" ? btn.url : undefined,
                    phoneNumber: btn.type === "CALL" ? btn.phoneNumber : undefined,
                  })),
                  updatedAt: now,
                }
              : t
          ),
          updatedAt: g.translations.some((t) => t.id === data.translationId)
            ? now
            : g.updatedAt,
        }))
      )
    },
    []
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

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
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
          isLoading={isLoading}
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
