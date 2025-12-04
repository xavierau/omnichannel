import * as React from "react"
import { FileImage, FileText, FileVideo, Upload, X, Link } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { HeaderType } from "@/pages/whatsapp-templates/types"

type MediaInputMode = "upload" | "url"

interface MediaUploaderProps {
  headerType: Exclude<HeaderType, "TEXT" | "NONE">
  value: { url?: string; file?: File }
  onChange: (value: { url?: string; file?: File }) => void
  error?: string
  disabled?: boolean
}

const MEDIA_CONFIG = {
  IMAGE: {
    accept: "image/jpeg,image/png,image/jpg",
    maxSize: 5 * 1024 * 1024, // 5MB
    icon: FileImage,
    label: "Image",
    description: "JPG, JPEG, or PNG up to 5MB",
  },
  VIDEO: {
    accept: "video/mp4",
    maxSize: 16 * 1024 * 1024, // 16MB
    icon: FileVideo,
    label: "Video",
    description: "MP4 up to 16MB",
  },
  DOCUMENT: {
    accept: "application/pdf",
    maxSize: 100 * 1024 * 1024, // 100MB
    icon: FileText,
    label: "Document",
    description: "PDF up to 100MB",
  },
} as const

export function MediaUploader({
  headerType,
  value,
  onChange,
  error,
  disabled = false,
}: MediaUploaderProps) {
  const [mode, setMode] = React.useState<MediaInputMode>(value.file ? "upload" : "url")
  const [urlInput, setUrlInput] = React.useState(value.url ?? "")
  const [dragActive, setDragActive] = React.useState(false)
  const [fileError, setFileError] = React.useState<string>()
  const inputRef = React.useRef<HTMLInputElement>(null)

  const config = MEDIA_CONFIG[headerType]
  const Icon = config.icon

  const handleModeChange = (newMode: MediaInputMode) => {
    setMode(newMode)
    setFileError(undefined)
    // Clear the other type of input when switching
    if (newMode === "upload") {
      setUrlInput("")
      onChange({ file: value.file })
    } else {
      onChange({ url: urlInput })
    }
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setUrlInput(url)
    onChange({ url })
  }

  const validateFile = (file: File): string | null => {
    // Check file type
    const acceptedTypes = config.accept.split(",")
    if (!acceptedTypes.some((type) => file.type === type || file.type.startsWith(type.replace("*", "")))) {
      return `Invalid file type. Accepted: ${config.description}`
    }

    // Check file size
    if (file.size > config.maxSize) {
      const maxSizeMB = config.maxSize / (1024 * 1024)
      return `File too large. Maximum size: ${maxSizeMB}MB`
    }

    return null
  }

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setFileError(validationError)
      return
    }

    setFileError(undefined)
    onChange({ file })
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setDragActive(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled) return

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleRemoveFile = () => {
    onChange({})
    setFileError(undefined)
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  const handleBrowseClick = () => {
    inputRef.current?.click()
  }

  // Get preview URL for uploaded file
  const previewUrl = React.useMemo(() => {
    if (value.file && headerType === "IMAGE") {
      return URL.createObjectURL(value.file)
    }
    return null
  }, [value.file, headerType])

  // Cleanup object URL on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const displayError = fileError || error

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Header {config.label} <span className="text-destructive">*</span>
        </Label>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "upload" ? "default" : "outline"}
          size="sm"
          onClick={() => handleModeChange("upload")}
          disabled={disabled}
          className="gap-1.5"
        >
          <Upload className="size-3.5" />
          Upload
        </Button>
        <Button
          type="button"
          variant={mode === "url" ? "default" : "outline"}
          size="sm"
          onClick={() => handleModeChange("url")}
          disabled={disabled}
          className="gap-1.5"
        >
          <Link className="size-3.5" />
          URL
        </Button>
      </div>

      {/* Upload Mode */}
      {mode === "upload" && (
        <div className="space-y-2">
          {value.file ? (
            // File Selected
            <div className="flex items-center gap-3 rounded-lg border border-input bg-muted/30 p-3">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="size-12 rounded object-cover"
                />
              ) : (
                <div className="flex size-12 items-center justify-center rounded bg-muted">
                  <Icon className="size-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{value.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(value.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRemoveFile}
                disabled={disabled}
                className="size-8 shrink-0"
              >
                <X className="size-4" />
                <span className="sr-only">Remove file</span>
              </Button>
            </div>
          ) : (
            // Drop Zone
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors
                ${dragActive ? "border-primary bg-primary/5" : "border-input"}
                ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-primary/50"}
              `}
              onClick={disabled ? undefined : handleBrowseClick}
            >
              <input
                ref={inputRef}
                type="file"
                accept={config.accept}
                onChange={handleFileInputChange}
                disabled={disabled}
                className="hidden"
              />
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <Icon className="size-5 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drop {config.label.toLowerCase()} here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* URL Mode */}
      {mode === "url" && (
        <div className="space-y-1.5">
          <Input
            type="url"
            placeholder={`Enter ${config.label.toLowerCase()} URL...`}
            value={urlInput}
            onChange={handleUrlChange}
            disabled={disabled}
            aria-invalid={!!displayError}
          />
          <p className="text-xs text-muted-foreground">
            Direct link to the {config.label.toLowerCase()} file
          </p>
        </div>
      )}

      {/* Error Display */}
      {displayError && (
        <p className="text-sm text-destructive">{displayError}</p>
      )}
    </div>
  )
}
