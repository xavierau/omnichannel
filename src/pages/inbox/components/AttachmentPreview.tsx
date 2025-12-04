import { useState, useRef, useCallback } from "react"
import { FileText, Play, Pause, Download, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import type { MessageAttachment, MessageDirection } from "../types"

interface AttachmentPreviewProps {
  attachment: MessageAttachment
  direction: MessageDirection
}

/**
 * Renders attachment previews for different media types.
 * Supports image (with lightbox), document (with download), and audio (with playback).
 */
export function AttachmentPreview({
  attachment,
  direction,
}: AttachmentPreviewProps) {
  switch (attachment.type) {
    case "image":
      return <ImagePreview attachment={attachment} direction={direction} />
    case "document":
      return <DocumentPreview attachment={attachment} direction={direction} />
    case "audio":
      return <AudioPreview attachment={attachment} direction={direction} />
    default:
      return null
  }
}

/**
 * Image preview with thumbnail and click-to-expand lightbox.
 */
function ImagePreview({
  attachment,
  direction,
}: AttachmentPreviewProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleImageError = useCallback(() => {
    setImageError(true)
  }, [])

  const handleOpen = useCallback(() => {
    if (!imageError) {
      setIsOpen(true)
    }
  }, [imageError])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "relative block overflow-hidden rounded-lg cursor-pointer",
          "max-w-[240px] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          imageError && "cursor-default"
        )}
        disabled={imageError}
        aria-label={imageError ? "Image unavailable" : "View full image"}
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
          <img
            src={attachment.url}
            alt={attachment.filename || "Image attachment"}
            onError={handleImageError}
            className="max-h-[200px] w-auto object-cover rounded-lg"
          />
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
 */
function DocumentPreview({
  attachment,
  direction,
}: AttachmentPreviewProps) {
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

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.filename}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg",
        "min-w-[200px] max-w-[280px]",
        "transition-colors hover:opacity-80",
        direction === "inbound"
          ? "bg-muted/50 hover:bg-muted/70"
          : "bg-white/10 hover:bg-white/20"
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
        <FileText className="size-5" />
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
        <p
          className={cn(
            "text-xs",
            direction === "inbound" ? "text-muted-foreground" : "text-white/70"
          )}
        >
          {getFileExtension(attachment.filename)}
          {attachment.size && ` - ${formatFileSize(attachment.size)}`}
        </p>
      </div>

      <Download
        className={cn(
          "size-4 shrink-0",
          direction === "inbound" ? "text-muted-foreground" : "text-white/70"
        )}
      />
    </a>
  )
}

/**
 * Audio preview with waveform visualization and playback controls.
 */
function AudioPreview({
  attachment,
  direction,
}: AttachmentPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(attachment.duration || 0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

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
      if (!audio || !duration) return

      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = x / rect.width
      const newTime = percentage * duration

      audio.currentTime = newTime
      setCurrentTime(newTime)
    },
    [duration]
  )

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg",
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
        onClick={handlePlayPause}
        className={cn(
          "shrink-0 rounded-full",
          direction === "inbound"
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-white text-emerald-600 hover:bg-white/90"
        )}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4 ml-0.5" />
        )}
      </Button>

      <div className="flex-1 min-w-0">
        {/* Waveform visualization (static bars) */}
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
            const isActive = barProgress <= progress
            // Create varied heights for waveform effect
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

        {/* Duration display */}
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
      </div>
    </div>
  )
}
