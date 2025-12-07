import { useState, useCallback } from "react"
import { MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import type { LocationMessage } from "../types"

interface LocationPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSend: (data: LocationMessage) => void
}

interface FormErrors {
  latitude?: string
  longitude?: string
}

/**
 * Sheet component for sharing location in WhatsApp messages.
 * For MVP, uses manual latitude/longitude input instead of map integration.
 */
export function LocationPicker({
  open,
  onOpenChange,
  onSend,
}: LocationPickerProps) {
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = useCallback(() => {
    setLatitude("")
    setLongitude("")
    setName("")
    setAddress("")
    setErrors({})
    setIsSubmitting(false)
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onOpenChange(false)
  }, [resetForm, onOpenChange])

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    // Validate latitude
    if (!latitude.trim()) {
      newErrors.latitude = "Latitude is required"
    } else {
      const lat = parseFloat(latitude)
      if (isNaN(lat)) {
        newErrors.latitude = "Must be a valid number"
      } else if (lat < -90 || lat > 90) {
        newErrors.latitude = "Must be between -90 and 90"
      }
    }

    // Validate longitude
    if (!longitude.trim()) {
      newErrors.longitude = "Longitude is required"
    } else {
      const lng = parseFloat(longitude)
      if (isNaN(lng)) {
        newErrors.longitude = "Must be a valid number"
      } else if (lng < -180 || lng > 180) {
        newErrors.longitude = "Must be between -180 and 180"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [latitude, longitude])

  const handleSubmit = useCallback(() => {
    if (!validateForm()) return

    setIsSubmitting(true)

    const data: LocationMessage = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      ...(name.trim() && { name: name.trim() }),
      ...(address.trim() && { address: address.trim() }),
    }

    onSend(data)
    handleClose()
  }, [validateForm, latitude, longitude, name, address, onSend, handleClose])

  const handleLatitudeChange = useCallback((value: string) => {
    // Allow only numbers, minus sign, and decimal point
    if (value === "" || /^-?\d*\.?\d*$/.test(value)) {
      setLatitude(value)
      if (errors.latitude) setErrors((prev) => ({ ...prev, latitude: undefined }))
    }
  }, [errors.latitude])

  const handleLongitudeChange = useCallback((value: string) => {
    // Allow only numbers, minus sign, and decimal point
    if (value === "" || /^-?\d*\.?\d*$/.test(value)) {
      setLongitude(value)
      if (errors.longitude) setErrors((prev) => ({ ...prev, longitude: undefined }))
    }
  }, [errors.longitude])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Share Location
          </SheetTitle>
          <SheetDescription>
            Enter the coordinates of the location you want to share.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 py-4">
          {/* Coordinates section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location-latitude">
                Latitude <span className="text-destructive">*</span>
              </Label>
              <Input
                id="location-latitude"
                value={latitude}
                onChange={(e) => handleLatitudeChange(e.target.value)}
                placeholder="e.g., 40.7128"
                disabled={isSubmitting}
                aria-invalid={!!errors.latitude}
              />
              {errors.latitude && (
                <p className="text-xs text-destructive">{errors.latitude}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location-longitude">
                Longitude <span className="text-destructive">*</span>
              </Label>
              <Input
                id="location-longitude"
                value={longitude}
                onChange={(e) => handleLongitudeChange(e.target.value)}
                placeholder="e.g., -74.0060"
                disabled={isSubmitting}
                aria-invalid={!!errors.longitude}
              />
              {errors.longitude && (
                <p className="text-xs text-destructive">{errors.longitude}</p>
              )}
            </div>
          </div>

          {/* Optional fields */}
          <div className="space-y-2">
            <Label htmlFor="location-name">Location Name (optional)</Label>
            <Input
              id="location-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Empire State Building"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location-address">Address (optional)</Label>
            <Input
              id="location-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., 350 5th Ave, New York, NY"
              disabled={isSubmitting}
            />
          </div>

          {/* Preview link */}
          {latitude && longitude && !errors.latitude && !errors.longitude && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Preview on Google Maps:</p>
              <a
                href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Open in Google Maps
              </a>
            </div>
          )}
        </div>

        <SheetFooter className="border-t pt-4">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Location"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
