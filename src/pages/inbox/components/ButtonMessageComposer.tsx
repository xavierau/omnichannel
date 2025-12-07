import { useState, useCallback } from "react"
import { Plus, Trash2 } from "lucide-react"
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
import type { InteractiveButtonsMessage } from "../types"

interface ButtonMessageComposerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend: (data: InteractiveButtonsMessage) => void
}

interface ButtonItem {
  id: string
  title: string
}

interface FormErrors {
  body?: string
  buttons?: string
  [key: string]: string | undefined
}

const MAX_BUTTONS = 3
const MAX_BUTTON_TITLE_LENGTH = 20

function generateId(): string {
  return `btn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function createEmptyButton(): ButtonItem {
  return {
    id: generateId(),
    title: "",
  }
}

/**
 * Sheet component for composing WhatsApp interactive button messages.
 * Allows creating up to 3 quick reply buttons for users to tap.
 */
export function ButtonMessageComposer({
  open,
  onOpenChange,
  onSend,
}: ButtonMessageComposerProps) {
  const [header, setHeader] = useState("")
  const [body, setBody] = useState("")
  const [footer, setFooter] = useState("")
  const [buttons, setButtons] = useState<ButtonItem[]>([createEmptyButton()])
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = useCallback(() => {
    setHeader("")
    setBody("")
    setFooter("")
    setButtons([createEmptyButton()])
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

    // Validate buttons
    const validButtons = buttons.filter((btn) => btn.title.trim())
    if (validButtons.length === 0) {
      newErrors.buttons = "At least one button is required"
    }

    buttons.forEach((btn, index) => {
      if (btn.title.trim() && btn.title.length > MAX_BUTTON_TITLE_LENGTH) {
        newErrors[`button_${index}`] = `Max ${MAX_BUTTON_TITLE_LENGTH} characters`
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [body, buttons])

  const handleSubmit = useCallback(() => {
    if (!validateForm()) return

    setIsSubmitting(true)

    // Clean up buttons - remove empty ones
    const cleanedButtons = buttons
      .filter((btn) => btn.title.trim())
      .map((btn) => ({
        id: btn.id,
        title: btn.title.trim(),
      }))

    const data: InteractiveButtonsMessage = {
      body: body.trim(),
      buttons: cleanedButtons,
      ...(header.trim() && { header: header.trim() }),
      ...(footer.trim() && { footer: footer.trim() }),
    }

    onSend(data)
    handleClose()
  }, [validateForm, buttons, body, header, footer, onSend, handleClose])

  const addButton = useCallback(() => {
    if (buttons.length >= MAX_BUTTONS) return
    setButtons((prev) => [...prev, createEmptyButton()])
  }, [buttons.length])

  const removeButton = useCallback((index: number) => {
    setButtons((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateButtonTitle = useCallback((index: number, title: string) => {
    setButtons((prev) =>
      prev.map((btn, i) => (i === index ? { ...btn, title } : btn))
    )
    // Clear error for this button
    setErrors((prev) => {
      const key = `button_${index}`
      if (prev[key]) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [key]: _, ...rest } = prev
        return rest
      }
      return prev
    })
  }, [])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Create Button Message</SheetTitle>
          <SheetDescription>
            Create an interactive message with up to 3 quick reply buttons.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-4 px-4">
          <div className="space-y-6 py-4">
            {/* Header (optional) */}
            <div className="space-y-2">
              <Label htmlFor="btn-header">Header (optional)</Label>
              <Input
                id="btn-header"
                value={header}
                onChange={(e) => setHeader(e.target.value)}
                placeholder="Enter header text"
                disabled={isSubmitting}
              />
            </div>

            {/* Body (required) */}
            <div className="space-y-2">
              <Label htmlFor="btn-body">
                Body <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="btn-body"
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
              <Label htmlFor="btn-footer">Footer (optional)</Label>
              <Input
                id="btn-footer"
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                placeholder="Enter footer text"
                disabled={isSubmitting}
              />
            </div>

            {/* Buttons */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>
                  Buttons <span className="text-destructive">*</span>
                </Label>
                <span className="text-xs text-muted-foreground">
                  {buttons.length}/{MAX_BUTTONS}
                </span>
              </div>

              {errors.buttons && <p className="text-sm text-destructive">{errors.buttons}</p>}

              <div className="space-y-3">
                {buttons.map((button, index) => (
                  <div key={button.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          value={button.title}
                          onChange={(e) => updateButtonTitle(index, e.target.value)}
                          placeholder={`Button ${index + 1} text`}
                          disabled={isSubmitting}
                          aria-invalid={!!errors[`button_${index}`]}
                          maxLength={MAX_BUTTON_TITLE_LENGTH}
                        />
                      </div>
                      {buttons.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeButton(index)}
                          disabled={isSubmitting}
                          aria-label="Remove button"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                    {errors[`button_${index}`] && (
                      <p className="text-xs text-destructive">{errors[`button_${index}`]}</p>
                    )}
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addButton}
                disabled={buttons.length >= MAX_BUTTONS || isSubmitting}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Button
              </Button>
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
