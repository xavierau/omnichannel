import { useState, useCallback, useRef, useEffect } from 'react'
import {
  mediaUploadService,
  type UploadProgress,
  type MediaUploadError,
} from '@/services/media-upload.service'

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export interface UploadState {
  status: UploadStatus
  progress: UploadProgress | null
  error: MediaUploadError | null
  downloadUrl: string | null
}

export interface UseMediaUploadOptions {
  conversationId?: string
  onSuccess?: (url: string, file: File) => void
  onError?: (error: MediaUploadError, file: File) => void
  onProgress?: (progress: UploadProgress, file: File) => void
}

export interface UseMediaUploadReturn {
  /** Start uploading a file */
  upload: (file: File) => Promise<string | null>
  /** Cancel the current upload */
  cancel: () => void
  /** Reset state to idle */
  reset: () => void
  /** Current upload status */
  status: UploadStatus
  /** Whether an upload is in progress */
  isUploading: boolean
  /** Current upload progress (null if not uploading) */
  progress: UploadProgress | null
  /** Upload error (null if no error) */
  error: MediaUploadError | null
  /** Download URL after successful upload */
  downloadUrl: string | null
}

const initialState: UploadState = {
  status: 'idle',
  progress: null,
  error: null,
  downloadUrl: null,
}

/**
 * Hook for handling media file uploads with progress tracking and cancellation.
 *
 * Features:
 * - Progress tracking via XHR upload events
 * - Cancellation support via AbortController
 * - File validation (size and type)
 * - Cleanup on unmount to prevent memory leaks
 *
 * @example
 * ```tsx
 * const { upload, isUploading, progress, error, cancel } = useMediaUpload({
 *   conversationId: '123',
 *   onSuccess: (url) => console.log('Uploaded to:', url),
 *   onError: (err) => console.error('Upload failed:', err),
 * });
 *
 * const handleFileSelect = async (file: File) => {
 *   const url = await upload(file);
 *   if (url) {
 *     // Use the download URL
 *   }
 * };
 * ```
 */
export function useMediaUpload(options: UseMediaUploadOptions = {}): UseMediaUploadReturn {
  const [state, setState] = useState<UploadState>(initialState)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)
  const currentFileRef = useRef<File | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      // Abort any in-progress upload on unmount
      abortControllerRef.current?.abort()
    }
  }, [])

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      // Cancel any existing upload
      abortControllerRef.current?.abort()

      // Create new abort controller for this upload
      const abortController = new AbortController()
      abortControllerRef.current = abortController
      currentFileRef.current = file

      // Reset state and start upload
      setState({
        status: 'uploading',
        progress: { loaded: 0, total: file.size, percentage: 0 },
        error: null,
        downloadUrl: null,
      })

      try {
        const url = await mediaUploadService.uploadMedia(
          file,
          options.conversationId,
          (progress) => {
            // Only update state if still mounted and not aborted
            if (isMountedRef.current && !abortController.signal.aborted) {
              setState((prev) => ({ ...prev, progress }))
              options.onProgress?.(progress, file)
            }
          },
          abortController.signal
        )

        // Only update state if still mounted
        if (isMountedRef.current) {
          setState({
            status: 'success',
            progress: { loaded: file.size, total: file.size, percentage: 100 },
            error: null,
            downloadUrl: url,
          })
          options.onSuccess?.(url, file)
        }

        return url
      } catch (err) {
        const error = err as MediaUploadError

        // Don't update state if aborted intentionally or unmounted
        if (error.code === 'UPLOAD_ABORTED' || !isMountedRef.current) {
          return null
        }

        setState({
          status: 'error',
          progress: null,
          error,
          downloadUrl: null,
        })
        options.onError?.(error, file)

        return null
      } finally {
        // Clean up refs if this is still the current upload
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null
          currentFileRef.current = null
        }
      }
    },
    [options]
  )

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    currentFileRef.current = null

    if (isMountedRef.current) {
      setState(initialState)
    }
  }, [])

  const reset = useCallback(() => {
    cancel()
    if (isMountedRef.current) {
      setState(initialState)
    }
  }, [cancel])

  return {
    upload,
    cancel,
    reset,
    status: state.status,
    isUploading: state.status === 'uploading',
    progress: state.progress,
    error: state.error,
    downloadUrl: state.downloadUrl,
  }
}

// Re-export types for convenience
export type { UploadProgress, MediaUploadError }
