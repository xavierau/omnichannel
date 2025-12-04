import { useState, useMemo, useCallback } from "react"
import { Search, FileText, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { mockTemplates } from "@/pages/whatsapp-templates/data/mock-templates"
import type { WhatsAppTemplate, TemplateCategory } from "@/pages/whatsapp-templates/types"
import { cn } from "@/lib/utils"

interface TemplateSelectorProps {
  onSelect: (templateId: string, templateName: string, content: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface GroupedTemplates {
  category: TemplateCategory
  templates: WhatsAppTemplate[]
}

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  MARKETING: "Marketing",
  UTILITY: "Utility",
  AUTHENTICATION: "Authentication",
}

const CATEGORY_ORDER: TemplateCategory[] = ["UTILITY", "MARKETING", "AUTHENTICATION"]

function getCategoryColor(category: TemplateCategory): string {
  switch (category) {
    case "MARKETING":
      return "bg-purple-100 text-purple-700 border-purple-200"
    case "UTILITY":
      return "bg-blue-100 text-blue-700 border-blue-200"
    case "AUTHENTICATION":
      return "bg-amber-100 text-amber-700 border-amber-200"
    default:
      return "bg-gray-100 text-gray-700 border-gray-200"
  }
}

export function TemplateSelector({
  onSelect,
  open,
  onOpenChange,
}: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  // Filter to only approved templates
  const approvedTemplates = useMemo(() => {
    return mockTemplates.filter((template) => template.status === "APPROVED")
  }, [])

  // Filter templates based on search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) {
      return approvedTemplates
    }

    const query = searchQuery.toLowerCase()
    return approvedTemplates.filter(
      (template) =>
        template.name.toLowerCase().includes(query) ||
        template.body.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query)
    )
  }, [approvedTemplates, searchQuery])

  // Group templates by category
  const groupedTemplates = useMemo(() => {
    const groups: GroupedTemplates[] = []

    for (const category of CATEGORY_ORDER) {
      const categoryTemplates = filteredTemplates.filter(
        (t) => t.category === category
      )
      if (categoryTemplates.length > 0) {
        groups.push({
          category,
          templates: categoryTemplates,
        })
      }
    }

    return groups
  }, [filteredTemplates])

  // Get the selected template details
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null
    return approvedTemplates.find((t) => t.id === selectedTemplateId) || null
  }, [selectedTemplateId, approvedTemplates])

  const handleTemplateClick = useCallback((templateId: string) => {
    setSelectedTemplateId((prev) => (prev === templateId ? null : templateId))
  }, [])

  const handleConfirm = useCallback(() => {
    if (!selectedTemplate) return

    onSelect(selectedTemplate.id, selectedTemplate.name, selectedTemplate.body)
    setSelectedTemplateId(null)
    setSearchQuery("")
    onOpenChange(false)
  }, [selectedTemplate, onSelect, onOpenChange])

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      onOpenChange(isOpen)
      if (!isOpen) {
        setSelectedTemplateId(null)
        setSearchQuery("")
      }
    },
    [onOpenChange]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Template</DialogTitle>
          <DialogDescription>
            Choose a pre-approved WhatsApp template to send to the customer.
          </DialogDescription>
        </DialogHeader>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates by name, content, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-1 gap-4 min-h-0">
          {/* Template list */}
          <ScrollArea className="flex-1 border rounded-md">
            <div className="p-2">
              {groupedTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "No templates match your search"
                      : "No approved templates available"}
                  </p>
                </div>
              ) : (
                groupedTemplates.map((group) => (
                  <div key={group.category} className="mb-4 last:mb-0">
                    <h4 className="text-xs font-medium text-muted-foreground px-2 py-1 sticky top-0 bg-background">
                      {CATEGORY_LABELS[group.category]} ({group.templates.length})
                    </h4>
                    <div className="space-y-1">
                      {group.templates.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => handleTemplateClick(template.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-md transition-colors",
                            "hover:bg-accent",
                            selectedTemplateId === template.id
                              ? "bg-accent ring-2 ring-primary"
                              : "bg-background"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm truncate">
                                  {template.name.replace(/_/g, " ")}
                                </span>
                                {selectedTemplateId === template.id && (
                                  <Check className="h-4 w-4 text-primary shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {template.body}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "shrink-0 text-xs",
                                getCategoryColor(template.category)
                              )}
                            >
                              {template.language.toUpperCase()}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Template preview */}
          <div className="w-64 border rounded-md p-4 bg-muted/30">
            <h4 className="text-sm font-medium mb-3">Preview</h4>
            {selectedTemplate ? (
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground">Name</span>
                  <p className="text-sm font-medium">
                    {selectedTemplate.name.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Category</span>
                  <p className="text-sm">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        getCategoryColor(selectedTemplate.category)
                      )}
                    >
                      {CATEGORY_LABELS[selectedTemplate.category]}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Language</span>
                  <p className="text-sm">{selectedTemplate.language.toUpperCase()}</p>
                </div>
                {selectedTemplate.header && (
                  <div>
                    <span className="text-xs text-muted-foreground">Header</span>
                    <p className="text-sm">
                      {selectedTemplate.header.text ||
                        `[${selectedTemplate.header.type}]`}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-muted-foreground">Body</span>
                  <p className="text-sm whitespace-pre-wrap bg-background p-2 rounded border text-xs">
                    {selectedTemplate.body}
                  </p>
                </div>
                {selectedTemplate.footer && (
                  <div>
                    <span className="text-xs text-muted-foreground">Footer</span>
                    <p className="text-sm text-muted-foreground italic">
                      {selectedTemplate.footer}
                    </p>
                  </div>
                )}
                {selectedTemplate.buttons.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Buttons</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedTemplate.buttons.map((btn) => (
                        <Badge key={btn.id} variant="secondary" className="text-xs">
                          {btn.text}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  Select a template to preview
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer with actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedTemplateId}
          >
            Use Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
