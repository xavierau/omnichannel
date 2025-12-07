import { useState, useRef, useCallback } from "react"
import { FileText, Play, Pause, Download, ImageIcon, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import type { MessageAttachment, MessageDirection } from "../types"
import type { UploadProgress, MediaUploadError } from "@/hooks/useMediaUpload"

/**
 * Upload state for an attachment being uploaded
 */
export interface AttachmentUploadState {
  isUploading: boolean
  progress: UploadProgress | null
  error: MediaUploadError | null
}

interface AttachmentPreviewProps {
  attachment: MessageAttachment
  direction: MessageDirection
  /** Upload state for attachments being uploaded */
  uploadState?: AttachmentUploadState
  /** Callback to retry a failed upload */
  onRetry?: () => void
}

/**
 * Renders attachment previews for different media types.
 * Supports image (with lightbox), document (with download), and audio (with playback).
 * Also handles upload state with loading overlay and error display.
 */
export function AttachmentPreview({
  attachment,
  direction,
  uploadState,
  onRetry,
}: AttachmentPreviewProps) {
  switch (attachment.type) {
    case "image":
      return (
        <ImagePreview
          attachment={attachment}
          direction={direction}
          uploadState={uploadState}
          onRetry={onRetry}
        />
      )
    case "document":
      return (
        <DocumentPreview
          attachment={attachment}
          direction={direction}
          uploadState={uploadState}
          onRetry={onRetry}
        />
      )
    case "audio":
      return (
        <AudioPreview
          attachment={attachment}
          direction={direction}
          uploadState={uploadState}
          onRetry={onRetry}
        />
      )
    default:
      return null
  }
}

/**
 * Loading overlay shown during upload
 */
function UploadOverlay({
  progress,
}: {
  progress: UploadProgress | null
}) {
  const percentage = progress?.percentage ?? 0

  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-2",
        "bg-black/50 backdrop-blur-sm rounded-lg"
      )}
      role="status"
      aria-label={`Uploading: ${percentage}%`}
    >
      <Loader2 className="size-6 animate-spin text-white" />
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs font-medium text-white">{percentage}%</span>
        {/* Progress bar */}
        <div className="w-16 h-1 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Error overlay shown when upload fails
 */
function ErrorOverlay({
  error,
  onRetry,
}: {
  error: MediaUploadError
  onRetry?: () => void
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-2 p-2",
        "bg-destructive/90 backdrop-blur-sm rounded-lg"
      )}
      role="alert"
    >
      <AlertCircle className="size-5 text-white" />
      <span className="text-xs text-white text-center line-clamp-2">
        {getErrorMessage(error)}
      </span>
      {onRetry && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onRetry}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className="size-3 mr-1" />
          Retry
        </Button>
      )}
    </div>
  )
}

function getErrorMessage(error: MediaUploadError): string {
  switch (error.code) {
    case 'FILE_TOO_LARGE':
      return 'File too large'
    case 'INVALID_FILE_TYPE':
      return 'Invalid file type'
    case 'UPLOAD_FAILED':
      return 'Upload failed'
    default:
      return error.message || 'Error'
  }
}

/**
 * Image preview with thumbnail and click-to-expand lightbox.
 * Shows upload progress overlay during upload.
 */
function ImagePreview({
  attachment,
  direction,
  uploadState,
  onRetry,
}: AttachmentPreviewProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [imageError, setImageError] = useState(false)

  const isUploading = uploadState?.isUploading ?? false
  const hasError = !!uploadState?.error

  const handleImageError = useCallback(() => {
    setImageError(true)
  }, [])

  const handleOpen = useCallback(() => {
    // Don't open lightbox if uploading, has error, or image failed to load
    if (!imageError && !isUploading && !hasError) {
      setIsOpen(true)
    }
  }, [imageError, isUploading, hasError])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const isDisabled = imageError || isUploading || hasError

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "relative block overflow-hidden rounded-lg",
          "max-w-[240px] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          isDisabled ? "cursor-default" : "cursor-pointer"
        )}
        disabled={isDisabled}
        aria-label={
          isUploading
            ? "Uploading image"
            : hasError
            ? "Upload failed"
            : imageError
            ? "Image unavailable"
            : "View full image"
        }
      >
        {imageError ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-2 p-6",
              "rounded-lg",
              direction === "inbound"
                ? "bg-muted/50"
                : "bg-white/10"
            )}
          >
            <ImageIcon className="size-8 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Image unavailable
            </span>
          </div>
        ) : (
          <>
            <img
              src={attachment.url}
              alt={attachment.filename || "Image attachment"}
              onError={handleImageError}
              className={cn(
                "max-h-[200px] w-auto object-cover rounded-lg",
                (isUploading || hasError) && "opacity-50"
              )}
            />
            {/* Upload overlay */}
            {isUploading && (
              <UploadOverlay progress={uploadState?.progress ?? null} />
            )}
            {/* Error overlay */}
            {hasError && uploadState?.error && (
              <ErrorOverlay error={uploadState.error} onRetry={onRetry} />
            )}
          </>
        )}
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="max-w-4xl p-0 bg-black/90 border-none"
          showCloseButton={true}
        >
          <DialogTitle className="sr-only">
            {attachment.filename || "Image preview"}
          </DialogTitle>
          <div className="flex items-center justify-center min-h-[300px] p-4">
            <img
              src={attachment.url}
              alt={attachment.filename || "Image attachment"}
              className="max-h-[80vh] max-w-full object-contain"
              onClick={handleClose}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Document preview with file icon, filename, and size.
 * Shows upload state with loading indicator and error handling.
 */
function DocumentPreview({
  attachment,
  direction,
  uploadState,
  onRetry,
}: AttachmentPreviewProps) {
  const isUploading = uploadState?.isUploading ?? false
  const hasError = !!uploadState?.error
  const progress = uploadState?.progress

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return ""
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getFileExtension = (filename?: string): string => {
    if (!filename) return "FILE"
    const parts = filename.split(".")
    return parts.length > 1 ? parts.pop()?.toUpperCase() || "FILE" : "FILE"
  }

  // Render as non-interactive during upload/error
  const Wrapper = isUploading || hasError ? 'div' : 'a'
  const wrapperProps = isUploading || hasError
    ? {}
    : {
        href: attachment.url,
        target: "_blank",
        rel: "noopener noreferrer",
        download: attachment.filename,
      }

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "relative flex items-center gap-3 p-3 rounded-lg",
        "min-w-[200px] max-w-[280px]",
        "transition-colors",
        direction === "inbound"
          ? "bg-muted/50"
          : "bg-white/10",
        !isUploading && !hasError && (
          direction === "inbound"
            ? "hover:bg-muted/70"
            : "hover:bg-white/20"
        ),
        (isUploading || hasError) && "cursor-default"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center shrink-0",
          "size-10 rounded-lg",
          direction === "inbound"
            ? "bg-primary/10 text-primary"
            : "bg-white/20 text-white"
        )}
      >
        {isUploading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : hasError ? (
          <AlertCircle className="size-5 text-destructive" />
        ) : (
          <FileText className="size-5" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium truncate",
            direction === "inbound" ? "text-foreground" : "text-white"
          )}
        >
          {attachment.filename || "Document"}
        </p>
        {hasError ? (
          <p className="text-xs text-destructive">
            {getErrorMessage(uploadState!.error!)}
          </p>
        ) : isUploading ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {progress?.percentage ?? 0}%
            </span>
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress?.percentage ?? 0}%` }}
              />
            </div>
          </div>
        ) : (
          <p
            className={cn(
              "text-xs",
              direction === "inbound" ? "text-muted-foreground" : "text-white/70"
            )}
          >
            {getFileExtension(attachment.filename)}
            {attachment.size && ` - ${formatFileSize(attachment.size)}`}
          </p>
        )}
      </div>

      {hasError && onRetry ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRetry}
          className="shrink-0"
          aria-label="Retry upload"
        >
          <RefreshCw className="size-4" />
        </Button>
      ) : !isUploading && !hasError ? (
        <Download
          className={cn(
            "size-4 shrink-0",
            direction === "inbound" ? "text-muted-foreground" : "text-white/70"
          )}
        />
      ) : null}
    </Wrapper>
  )
}

/**
 * Audio preview with waveform visualization and playback controls.
 * Shows upload state with loading indicator.
 */
function AudioPreview({
  attachment,
  direction,
  uploadState,
  onRetry,
}: AttachmentPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(attachment.duration || 0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const isUploading = uploadState?.isUploading ?? false
  const hasError = !!uploadState?.error
  const progress = uploadState?.progress

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current
    if (!audio || isUploading || hasError) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying, isUploading, hasError])

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      setCurrentTime(audio.currentTime)
    }
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current
    if (audio && audio.duration && isFinite(audio.duration)) {
      setDuration(audio.duration)
    }
  }, [])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
  }, [])

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current
      if (!audio || !duration || isUploading || hasError) return

      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = x / rect.width
      const newTime = percentage * duration

      audio.currentTime = newTime
      setCurrentTime(newTime)
    },
    [duration, isUploading, hasError]
  )

  const playbackProgress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 p-3 rounded-lg",
        "min-w-[200px] max-w-[280px]",
        direction === "inbound"
          ? "bg-muted/50"
          : "bg-white/10"
      )}
    >
      <audio
        ref={audioRef}
        src={attachment.url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={isUploading || hasError ? undefined : handlePlayPause}
        disabled={isUploading || hasError}
        className={cn(
          "shrink-0 rounded-full",
          direction === "inbound"
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-white text-emerald-600 hover:bg-white/90",
          (isUploading || hasError) && "opacity-50"
        )}
        aria-label={
          isUploading
            ? "Uploading"
            : hasError
            ? "Upload failed"
            : isPlaying
            ? "Pause"
            : "Play"
        }
      >
        {isUploading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : hasError ? (
          <AlertCircle className="size-4" />
        ) : isPlaying ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4 ml-0.5" />
        )}
      </Button>

      <div className="flex-1 min-w-0">
        {isUploading ? (
          // Upload progress
          <div className="space-y-1">
            <div className="h-6 flex items-center">
              <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress?.percentage ?? 0}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between">
              <span
                className={cn(
                  "text-xs",
                  direction === "inbound" ? "text-muted-foreground" : "text-white/70"
                )}
              >
                Uploading...
              </span>
              <span
                className={cn(
                  "text-xs",
                  direction === "inbound" ? "text-muted-foreground" : "text-white/70"
                )}
              >
                {progress?.percentage ?? 0}%
              </span>
            </div>
          </div>
        ) : hasError ? (
          // Error state
          <div className="flex items-center justify-between">
            <span className="text-xs text-destructive">
              {getErrorMessage(uploadState!.error!)}
            </span>
            {onRetry && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onRetry}
                className="size-6"
                aria-label="Retry upload"
              >
                <RefreshCw className="size-3" />
              </Button>
            )}
          </div>
        ) : (
          // Normal playback state
          <>
            <div
              className="relative h-6 flex items-center gap-px cursor-pointer"
              onClick={handleSeek}
              role="slider"
              aria-label="Audio progress"
              aria-valuenow={currentTime}
              aria-valuemin={0}
              aria-valuemax={duration}
              tabIndex={0}
            >
              {/* Generate waveform bars */}
              {Array.from({ length: 30 }).map((_, i) => {
                const barProgress = (i / 30) * 100
                const isActive = barProgress <= playbackProgress
                const heights = [40, 60, 80, 100, 70, 50, 90, 65, 85, 45]
                const height = heights[i % heights.length]

                return (
                  <div
                    key={i}
                    className={cn(
                      "w-1 rounded-full transition-colors",
                      isActive
                        ? direction === "inbound"
                          ? "bg-primary"
                          : "bg-white"
                        : direction === "inbound"
                        ? "bg-muted-foreground/30"
                        : "bg-white/30"
                    )}
                    style={{ height: `${height}%` }}
                  />
                )
              })}
            </div>

            <div className="flex justify-between mt-1">
              <span
                className={cn(
                  "text-xs",
                  direction === "inbound" ? "text-muted-foreground" : "text-white/70"
                )}
              >
                {formatTime(currentTime)}
              </span>
              <span
                className={cn(
                  "text-xs",
                  direction === "inbound" ? "text-muted-foreground" : "text-white/70"
                )}
              >
                {formatTime(duration)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
