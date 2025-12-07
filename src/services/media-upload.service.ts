/**
 * Media Upload Service
 *
 * Provides functionality for uploading media files to S3 via presigned URLs.
 * Uses XHR for upload progress tracking since fetch API doesn't support progress events.
 */

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface PresignedUrlResponse {
  uploadUrl: string
  downloadUrl: string
  key: string
}

export interface MediaUploadError extends Error {
  code: 'PRESIGNED_URL_FAILED' | 'UPLOAD_FAILED' | 'UPLOAD_ABORTED' | 'FILE_TOO_LARGE' | 'INVALID_FILE_TYPE'
  statusCode?: number
}

/**
 * File size limits in bytes
 */
export const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024,     // 5MB
  video: 16 * 1024 * 1024,    // 16MB
  document: 100 * 1024 * 1024, // 100MB
  audio: 16 * 1024 * 1024,    // 16MB
} as const

/**
 * Accepted MIME types by category
 */
export const ACCEPTED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/3gpp'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip',
  ],
  audio: ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4'],
} as const

type MediaCategory = keyof typeof FILE_SIZE_LIMITS

function createMediaUploadError(
  message: string,
  code: MediaUploadError['code'],
  statusCode?: number
): MediaUploadError {
  const error = new Error(message) as MediaUploadError
  error.code = code
  error.statusCode = statusCode
  return error
}

/**
 * Determines the media category from a file's MIME type
 */
function getMediaCategory(mimeType: string): MediaCategory | null {
  for (const [category, types] of Object.entries(ACCEPTED_MIME_TYPES)) {
    if ((types as readonly string[]).includes(mimeType)) {
      return category as MediaCategory
    }
  }
  return null
}

/**
 * Validates a file against size and type constraints
 */
function validateFile(file: File): void {
  const category = getMediaCategory(file.type)

  if (!category) {
    throw createMediaUploadError(
      `File type "${file.type}" is not supported`,
      'INVALID_FILE_TYPE'
    )
  }

  const maxSize = FILE_SIZE_LIMITS[category]
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024)
    throw createMediaUploadError(
      `File size exceeds ${maxSizeMB}MB limit for ${category} files`,
      'FILE_TOO_LARGE'
    )
  }
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export const mediaUploadService = {
  /**
   * Get a presigned URL for uploading a file
   */
  async getPresignedUrl(
    filename: string,
    contentType: string,
    conversationId?: string
  ): Promise<PresignedUrlResponse> {
    const response = await fetch('/api/media/presigned-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, contentType, conversationId }),
    })

    if (!response.ok) {
      throw createMediaUploadError(
        'Failed to get presigned URL',
        'PRESIGNED_URL_FAILED',
        response.status
      )
    }

    return response.json()
  },

  /**
   * Upload file directly to S3 using presigned URL with progress tracking.
   * Uses XHR because fetch doesn't support upload progress events.
   *
   * @param file - The file to upload
   * @param uploadUrl - The presigned S3 URL
   * @param onProgress - Optional callback for progress updates
   * @param abortSignal - Optional AbortSignal for cancellation
   */
  uploadToS3(
    file: File,
    uploadUrl: string,
    onProgress?: (progress: UploadProgress) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // Handle abort signal
      if (abortSignal) {
        if (abortSignal.aborted) {
          reject(createMediaUploadError('Upload aborted', 'UPLOAD_ABORTED'))
          return
        }

        const abortHandler = () => {
          xhr.abort()
        }
        abortSignal.addEventListener('abort', abortHandler)

        // Cleanup listener when request completes
        xhr.addEventListener('loadend', () => {
          abortSignal.removeEventListener('abort', abortHandler)
        })
      }

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          })
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(
            createMediaUploadError(
              `Upload failed with status ${xhr.status}`,
              'UPLOAD_FAILED',
              xhr.status
            )
          )
        }
      })

      xhr.addEventListener('error', () => {
        reject(createMediaUploadError('Upload failed due to network error', 'UPLOAD_FAILED'))
      })

      xhr.addEventListener('abort', () => {
        reject(createMediaUploadError('Upload aborted', 'UPLOAD_ABORTED'))
      })

      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)
    })
  },

  /**
   * Complete upload flow: validate file, get presigned URL, and upload.
   *
   * @param file - The file to upload
   * @param conversationId - Optional conversation ID for organizing uploads
   * @param onProgress - Optional callback for progress updates
   * @param abortSignal - Optional AbortSignal for cancellation
   * @returns The download URL for the uploaded file
   */
  async uploadMedia(
    file: File,
    conversationId?: string,
    onProgress?: (progress: UploadProgress) => void,
    abortSignal?: AbortSignal
  ): Promise<string> {
    // Validate file before attempting upload
    validateFile(file)

    // Check if already aborted
    if (abortSignal?.aborted) {
      throw createMediaUploadError('Upload aborted', 'UPLOAD_ABORTED')
    }

    const { uploadUrl, downloadUrl } = await this.getPresignedUrl(
      file.name,
      file.type,
      conversationId
    )

    await this.uploadToS3(file, uploadUrl, onProgress, abortSignal)

    return downloadUrl
  },

  /**
   * Validate a file without uploading
   */
  validateFile,

  /**
   * Get the media category for a file
   */
  getMediaCategory,
}
