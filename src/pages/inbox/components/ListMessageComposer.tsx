import { useState, useCallback } from "react"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { InteractiveListMessage, InteractiveListSection, InteractiveListRow } from "../types"

interface ListMessageComposerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend: (data: InteractiveListMessage) => void
}

interface FormErrors {
  body?: string
  buttonText?: string
  sections?: string
  [key: string]: string | undefined
}

const MAX_SECTIONS = 10
const MAX_ROWS_PER_SECTION = 10
const MAX_ROW_TITLE_LENGTH = 24
const MAX_ROW_DESCRIPTION_LENGTH = 72

function generateId(): string {
  return `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function createEmptyRow(): InteractiveListRow {
  return {
    id: generateId(),
    title: "",
    description: "",
  }
}

function createEmptySection(): InteractiveListSection {
  return {
    title: "",
    rows: [createEmptyRow()],
  }
}

/**
 * Sheet component for composing WhatsApp interactive list messages.
 * Allows creating sections with multiple row options for users to select from.
 */
export function ListMessageComposer({
  open,
  onOpenChange,
  onSend,
}: ListMessageComposerProps) {
  const [header, setHeader] = useState("")
  const [body, setBody] = useState("")
  const [footer, setFooter] = useState("")
  const [buttonText, setButtonText] = useState("")
  const [sections, setSections] = useState<InteractiveListSection[]>([createEmptySection()])
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = useCallback(() => {
    setHeader("")
    setBody("")
    setFooter("")
    setButtonText("")
    setSections([createEmptySection()])
    setErrors({})
    setIsSubmitting(false)
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onOpenChange(false)
  }, [resetForm, onOpenChange])

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    if (!body.trim()) {
      newErrors.body = "Body text is required"
    }

    if (!buttonText.trim()) {
      newErrors.buttonText = "Button text is required"
    }

    // Validate sections
    let hasValidSection = false
    sections.forEach((section, sectionIndex) => {
      const validRows = section.rows.filter((row) => row.title.trim())
      if (validRows.length > 0) {
        hasValidSection = true
      }
      section.rows.forEach((row, rowIndex) => {
        if (row.title.trim() && row.title.length > MAX_ROW_TITLE_LENGTH) {
          newErrors[`section_${sectionIndex}_row_${rowIndex}_title`] =
            `Max ${MAX_ROW_TITLE_LENGTH} characters`
        }
        if (row.description && row.description.length > MAX_ROW_DESCRIPTION_LENGTH) {
          newErrors[`section_${sectionIndex}_row_${rowIndex}_desc`] =
            `Max ${MAX_ROW_DESCRIPTION_LENGTH} characters`
        }
      })
    })

    if (!hasValidSection) {
      newErrors.sections = "At least one section with one row is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [body, buttonText, sections])

  const handleSubmit = useCallback(() => {
    if (!validateForm()) return

    setIsSubmitting(true)

    // Clean up sections - remove empty rows and sections
    const cleanedSections = sections
      .map((section) => ({
        ...section,
        rows: section.rows.filter((row) => row.title.trim()),
      }))
      .filter((section) => section.rows.length > 0)

    const data: InteractiveListMessage = {
      body: body.trim(),
      buttonText: buttonText.trim(),
      sections: cleanedSections,
      ...(header.trim() && { header: header.trim() }),
      ...(footer.trim() && { footer: footer.trim() }),
    }

    onSend(data)
    handleClose()
  }, [validateForm, sections, body, buttonText, header, footer, onSend, handleClose])

  const addSection = useCallback(() => {
    if (sections.length >= MAX_SECTIONS) return
    setSections((prev) => [...prev, createEmptySection()])
  }, [sections.length])

  const removeSection = useCallback((index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateSectionTitle = useCallback((index: number, title: string) => {
    setSections((prev) =>
      prev.map((section, i) => (i === index ? { ...section, title } : section))
    )
  }, [])

  const addRow = useCallback((sectionIndex: number) => {
    setSections((prev) =>
      prev.map((section, i) => {
        if (i !== sectionIndex) return section
        if (section.rows.length >= MAX_ROWS_PER_SECTION) return section
        return { ...section, rows: [...section.rows, createEmptyRow()] }
      })
    )
  }, [])

  const removeRow = useCallback((sectionIndex: number, rowIndex: number) => {
    setSections((prev) =>
      prev.map((section, i) => {
        if (i !== sectionIndex) return section
        return { ...section, rows: section.rows.filter((_, ri) => ri !== rowIndex) }
      })
    )
  }, [])

  const updateRow = useCallback(
    (sectionIndex: number, rowIndex: number, field: "title" | "description", value: string) => {
      setSections((prev) =>
        prev.map((section, si) => {
          if (si !== sectionIndex) return section
          return {
            ...section,
            rows: section.rows.map((row, ri) =>
              ri === rowIndex ? { ...row, [field]: value } : row
            ),
          }
        })
      )
      // Clear error for this field
      setErrors((prev) => {
        const key = `section_${sectionIndex}_row_${rowIndex}_${field === "title" ? "title" : "desc"}`
        if (prev[key]) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [key]: _, ...rest } = prev
          return rest
        }
        return prev
      })
    },
    []
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Create List Message</SheetTitle>
          <SheetDescription>
            Create an interactive list message with selectable options.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-4 px-4">
          <div className="space-y-6 py-4">
            {/* Header (optional) */}
            <div className="space-y-2">
              <Label htmlFor="list-header">Header (optional)</Label>
              <Input
                id="list-header"
                value={header}
                onChange={(e) => setHeader(e.target.value)}
                placeholder="Enter header text"
                disabled={isSubmitting}
              />
            </div>

            {/* Body (required) */}
            <div className="space-y-2">
              <Label htmlFor="list-body">
                Body <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="list-body"
                value={body}
                onChange={(e) => {
                  setBody(e.target.value)
                  if (errors.body) setErrors((prev) => ({ ...prev, body: undefined }))
                }}
                placeholder="Enter message body"
                disabled={isSubmitting}
                aria-invalid={!!errors.body}
                rows={3}
              />
              {errors.body && <p className="text-sm text-destructive">{errors.body}</p>}
            </div>

            {/* Footer (optional) */}
            <div className="space-y-2">
              <Label htmlFor="list-footer">Footer (optional)</Label>
              <Input
                id="list-footer"
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                placeholder="Enter footer text"
                disabled={isSubmitting}
              />
            </div>

            {/* Button Text (required) */}
            <div className="space-y-2">
              <Label htmlFor="list-button-text">
                Button Text <span className="text-destructive">*</span>
              </Label>
              <Input
                id="list-button-text"
                value={buttonText}
                onChange={(e) => {
                  setButtonText(e.target.value)
                  if (errors.buttonText) setErrors((prev) => ({ ...prev, buttonText: undefined }))
                }}
                placeholder="e.g., View Options"
                disabled={isSubmitting}
                aria-invalid={!!errors.buttonText}
              />
              {errors.buttonText && (
                <p className="text-sm text-destructive">{errors.buttonText}</p>
              )}
            </div>

            {/* Sections */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Sections</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSection}
                  disabled={sections.length >= MAX_SECTIONS || isSubmitting}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Section
                </Button>
              </div>

              {errors.sections && <p className="text-sm text-destructive">{errors.sections}</p>}

              {sections.map((section, sectionIndex) => (
                <div
                  key={sectionIndex}
                  className="border rounded-lg p-4 space-y-4 bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <Input
                      value={section.title}
                      onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                      placeholder={`Section ${sectionIndex + 1} title (optional)`}
                      disabled={isSubmitting}
                      className="flex-1"
                    />
                    {sections.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSection(sectionIndex)}
                        disabled={isSubmitting}
                        aria-label="Remove section"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  {/* Rows */}
                  <div className="space-y-3 pl-6">
                    {section.rows.map((row, rowIndex) => (
                      <div key={row.id} className="space-y-2 border-l-2 border-muted pl-3">
                        <div className="flex items-center gap-2">
                          <Input
                            value={row.title}
                            onChange={(e) =>
                              updateRow(sectionIndex, rowIndex, "title", e.target.value)
                            }
                            placeholder="Row title (required)"
                            disabled={isSubmitting}
                            aria-invalid={!!errors[`section_${sectionIndex}_row_${rowIndex}_title`]}
                            className="flex-1"
                            maxLength={MAX_ROW_TITLE_LENGTH}
                          />
                          {section.rows.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeRow(sectionIndex, rowIndex)}
                              disabled={isSubmitting}
                              aria-label="Remove row"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                        {errors[`section_${sectionIndex}_row_${rowIndex}_title`] && (
                          <p className="text-xs text-destructive">
                            {errors[`section_${sectionIndex}_row_${rowIndex}_title`]}
                          </p>
                        )}
                        <Input
                          value={row.description || ""}
                          onChange={(e) =>
                            updateRow(sectionIndex, rowIndex, "description", e.target.value)
                          }
                          placeholder="Description (optional)"
                          disabled={isSubmitting}
                          aria-invalid={!!errors[`section_${sectionIndex}_row_${rowIndex}_desc`]}
                          maxLength={MAX_ROW_DESCRIPTION_LENGTH}
                        />
                        {errors[`section_${sectionIndex}_row_${rowIndex}_desc`] && (
                          <p className="text-xs text-destructive">
                            {errors[`section_${sectionIndex}_row_${rowIndex}_desc`]}
                          </p>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addRow(sectionIndex)}
                      disabled={section.rows.length >= MAX_ROWS_PER_SECTION || isSubmitting}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Row
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="border-t pt-4">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Message"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
