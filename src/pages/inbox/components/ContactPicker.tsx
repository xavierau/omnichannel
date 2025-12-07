import { useState, useCallback } from "react"
import { Plus, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ContactMessage } from "../types"

interface ContactPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend: (data: ContactMessage) => void
}

interface PhoneEntry {
  id: string
  phone: string
  type: string
}

interface FormErrors {
  formattedName?: string
  phones?: string
  [key: string]: string | undefined
}

const PHONE_TYPES = [
  { value: "CELL", label: "Mobile" },
  { value: "WORK", label: "Work" },
  { value: "HOME", label: "Home" },
  { value: "MAIN", label: "Main" },
  { value: "OTHER", label: "Other" },
]

function generateId(): string {
  return `phone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function createEmptyPhone(): PhoneEntry {
  return {
    id: generateId(),
    phone: "",
    type: "CELL",
  }
}

/**
 * Sheet component for sharing contact information in WhatsApp messages.
 * Allows entering contact name and multiple phone numbers.
 */
export function ContactPicker({
  open,
  onOpenChange,
  onSend,
}: ContactPickerProps) {
  const [formattedName, setFormattedName] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phones, setPhones] = useState<PhoneEntry[]>([createEmptyPhone()])
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = useCallback(() => {
    setFormattedName("")
    setFirstName("")
    setLastName("")
    setPhones([createEmptyPhone()])
    setErrors({})
    setIsSubmitting(false)
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onOpenChange(false)
  }, [resetForm, onOpenChange])

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    if (!formattedName.trim()) {
      newErrors.formattedName = "Contact name is required"
    }

    // Check if at least one valid phone number exists
    const validPhones = phones.filter((p) => p.phone.trim())
    if (validPhones.length === 0) {
      newErrors.phones = "At least one phone number is required"
    }

    // Validate phone number format (basic validation)
    phones.forEach((phone, index) => {
      if (phone.phone.trim()) {
        const digitsOnly = phone.phone.replace(/\D/g, "")
        if (digitsOnly.length < 7 || digitsOnly.length > 15) {
          newErrors[`phone_${index}`] = "Invalid phone number (7-15 digits)"
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formattedName, phones])

  const handleSubmit = useCallback(() => {
    if (!validateForm()) return

    setIsSubmitting(true)

    // Clean up phones - remove empty ones
    const cleanedPhones = phones
      .filter((p) => p.phone.trim())
      .map((p) => ({
        phone: p.phone.trim(),
        type: p.type,
      }))

    const data: ContactMessage = {
      name: {
        formatted_name: formattedName.trim(),
        ...(firstName.trim() && { first_name: firstName.trim() }),
        ...(lastName.trim() && { last_name: lastName.trim() }),
      },
      phones: cleanedPhones,
    }

    onSend(data)
    handleClose()
  }, [validateForm, phones, formattedName, firstName, lastName, onSend, handleClose])

  const addPhone = useCallback(() => {
    setPhones((prev) => [...prev, createEmptyPhone()])
  }, [])

  const removePhone = useCallback((index: number) => {
    setPhones((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updatePhone = useCallback((index: number, field: "phone" | "type", value: string) => {
    setPhones((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    )
    if (field === "phone") {
      setErrors((prev) => {
        const key = `phone_${index}`
        if (prev[key]) {
          const { [key]: _, ...rest } = prev
          return rest
        }
        return prev
      })
    }
  }, [])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share Contact
          </SheetTitle>
          <SheetDescription>
            Enter the contact information you want to share.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-4 px-4">
          <div className="space-y-6 py-4">
            {/* Name section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact-formatted-name">
                  Display Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contact-formatted-name"
                  value={formattedName}
                  onChange={(e) => {
                    setFormattedName(e.target.value)
                    if (errors.formattedName) {
                      setErrors((prev) => ({ ...prev, formattedName: undefined }))
                    }
                  }}
                  placeholder="e.g., John Doe"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.formattedName}
                />
                {errors.formattedName && (
                  <p className="text-sm text-destructive">{errors.formattedName}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-first-name">First Name (optional)</Label>
                  <Input
                    id="contact-first-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-last-name">Last Name (optional)</Label>
                  <Input
                    id="contact-last-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* Phone numbers section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>
                  Phone Numbers <span className="text-destructive">*</span>
                </Label>
              </div>

              {errors.phones && <p className="text-sm text-destructive">{errors.phones}</p>}

              <div className="space-y-3">
                {phones.map((phone, index) => (
                  <div key={phone.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          value={phone.phone}
                          onChange={(e) => updatePhone(index, "phone", e.target.value)}
                          placeholder="+1 555-123-4567"
                          disabled={isSubmitting}
                          aria-invalid={!!errors[`phone_${index}`]}
                        />
                      </div>
                      <Select
                        value={phone.type}
                        onValueChange={(value) => updatePhone(index, "type", value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PHONE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {phones.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePhone(index)}
                          disabled={isSubmitting}
                          aria-label="Remove phone number"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                    {errors[`phone_${index}`] && (
                      <p className="text-xs text-destructive">{errors[`phone_${index}`]}</p>
                    )}
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPhone}
                disabled={isSubmitting}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Phone Number
              </Button>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="border-t pt-4">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Contact"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
