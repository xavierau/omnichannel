import { X, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { UploadProgress, MediaUploadError } from '@/hooks/useMediaUpload'
import { formatFileSize } from '@/services/media-upload.service'

interface MediaUploadProgressProps {
  /** Current upload progress */
  progress: UploadProgress | null
  /** File name being uploaded */
  fileName: string
  /** File size in bytes */
  fileSize: number
  /** Cancel the upload */
  onCancel: () => void
  /** Error state (if upload failed) */
  error?: MediaUploadError | null
  /** Retry the upload */
  onRetry?: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Displays upload progress with a progress bar, file info, and cancel button.
 * Shows error state with retry option when upload fails.
 */
export function MediaUploadProgress({
  progress,
  fileName,
  fileSize,
  onCancel,
  error,
  onRetry,
  className,
}: MediaUploadProgressProps) {
  const percentage = progress?.percentage ?? 0
  const isComplete = percentage === 100
  const hasError = !!error

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-3 py-2',
        hasError ? 'border-destructive/50 bg-destructive/5' : 'border-input bg-muted/30',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={hasError ? `Upload failed: ${error.message}` : `Uploading ${fileName}`}
    >
      {/* Progress indicator or error icon */}
      <div className="relative shrink-0">
        {hasError ? (
          <div className="flex size-8 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="size-4 text-destructive" />
          </div>
        ) : (
          <div className="relative size-8">
            {/* Circular progress background */}
            <svg className="size-8 -rotate-90" viewBox="0 0 32 32">
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-muted"
              />
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={2 * Math.PI * 14}
                strokeDashoffset={2 * Math.PI * 14 * (1 - percentage / 100)}
                strokeLinecap="round"
                className={cn(
                  'transition-all duration-300',
                  isComplete ? 'text-green-500' : 'text-primary'
                )}
              />
            </svg>
            {/* Percentage text */}
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
              {percentage}%
            </span>
          </div>
        )}
      </div>

      {/* File info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{fileName}</p>
        {hasError ? (
          <p className="text-xs text-destructive">{getErrorMessage(error)}</p>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {formatFileSize(progress?.loaded ?? 0)} / {formatFileSize(fileSize)}
            </p>
            {/* Linear progress bar */}
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  isComplete ? 'bg-green-500' : 'bg-primary'
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex shrink-0 items-center gap-1">
        {hasError && onRetry && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRetry}
            className="size-7"
            aria-label="Retry upload"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="size-7"
          aria-label={hasError ? 'Remove' : 'Cancel upload'}
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

/**
 * Get a user-friendly error message from the upload error
 */
function getErrorMessage(error: MediaUploadError): string {
  switch (error.code) {
    case 'FILE_TOO_LARGE':
      return 'File is too large'
    case 'INVALID_FILE_TYPE':
      return 'Unsupported file type'
    case 'PRESIGNED_URL_FAILED':
      return 'Could not prepare upload'
    case 'UPLOAD_FAILED':
      return 'Upload failed. Please try again.'
    case 'UPLOAD_ABORTED':
      return 'Upload was cancelled'
    default:
      return error.message || 'Upload failed'
  }
}
