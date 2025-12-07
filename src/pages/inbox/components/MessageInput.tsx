import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
} from "react"
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  FileText,
  LayoutTemplate,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmojiPicker } from "./EmojiPicker"
import { VoiceNoteButton } from "./VoiceNoteButton"
import { TemplateSelector } from "./TemplateSelector"
import { InteractiveMessageMenu } from "./InteractiveMessageMenu"
import { MediaUploadProgress } from "./MediaUploadProgress"
import { useMediaUpload } from "@/hooks/useMediaUpload"
import { formatFileSize } from "@/services/media-upload.service"
import type {
  MessageType,
  InteractiveListMessage,
  InteractiveButtonsMessage,
  LocationMessage,
  ContactMessage,
} from "../types"
import { cn } from "@/lib/utils"

/**
 * Payload for sending messages with different types.
 * Supports text, attachments (with S3 URL), and interactive message types.
 */
export interface SendMessagePayload {
  type: MessageType
  content?: string
  /** @deprecated Use mediaUrl instead for uploaded files */
  attachment?: File
  /** S3 URL for uploaded media */
  mediaUrl?: string
  interactiveList?: InteractiveListMessage
  interactiveButtons?: InteractiveButtonsMessage
  location?: LocationMessage
  contact?: ContactMessage
}

interface MessageInputProps {
  onSend: (payload: SendMessagePayload) => void
  disabled?: boolean
  placeholder?: string
  /** Conversation ID for organizing media uploads */
  conversationId?: string
}

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/gif,image/webp"
const ACCEPTED_DOCUMENT_TYPES =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  conversationId,
}: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<"image" | "document" | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  // Media upload hook
  const {
    upload,
    cancel: cancelUpload,
    reset: resetUpload,
    isUploading,
    progress,
    error: uploadError,
    status: uploadStatus,
  } = useMediaUpload({
    conversationId,
    onSuccess: (url) => {
      setUploadedUrl(url)
    },
    onError: (error, file) => {
      console.error(`Upload failed for ${file.name}:`, error.message)
    },
  })

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Auto-resize textarea based on content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = "auto"
    const maxHeight = 150
    const newHeight = Math.min(textarea.scrollHeight, maxHeight)
    textarea.style.height = `${newHeight}px`
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [message, adjustTextareaHeight])

  const resetInput = useCallback(() => {
    setMessage("")
    setSelectedFile(null)
    setFileType(null)
    setUploadedUrl(null)
    resetUpload()
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }, [resetUpload])

  const handleSendMessage = useCallback(() => {
    const trimmedMessage = message.trim()

    // Cannot send if uploading
    if (isUploading) return

    // Cannot send without content or completed upload
    if (!trimmedMessage && !uploadedUrl) return

    if (uploadedUrl && fileType) {
      // Send with uploaded media URL
      onSend({
        type: fileType,
        content: trimmedMessage || selectedFile?.name || "Media",
        mediaUrl: uploadedUrl,
      })
    } else if (trimmedMessage) {
      // Send text only
      onSend({ type: "text", content: trimmedMessage })
    }

    resetInput()
    textareaRef.current?.focus()
  }, [message, uploadedUrl, fileType, selectedFile, isUploading, onSend, resetInput])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Send on Enter, newline on Shift+Enter
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage()
      }
    },
    [handleSendMessage]
  )

  const handleMessageChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(e.target.value)
    },
    []
  )

  const handleEmojiSelect = useCallback((emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      setMessage((prev) => prev + emoji)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value

    setMessage(text.substring(0, start) + emoji + text.substring(end))

    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + emoji.length
      textarea.focus()
    })
  }, [])

  const handleImageSelect = useCallback(() => {
    imageInputRef.current?.click()
  }, [])

  const handleDocumentSelect = useCallback(() => {
    documentInputRef.current?.click()
  }, [])

  /**
   * Handles file selection and immediately starts upload
   */
  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>, type: "image" | "document") => {
      const file = e.target.files?.[0]
      if (file) {
        // Clear any previous upload state
        setUploadedUrl(null)
        setSelectedFile(file)
        setFileType(type)

        // Start upload immediately
        await upload(file)
      }
      // Reset the input so the same file can be selected again
      e.target.value = ""
    },
    [upload]
  )

  /**
   * Removes the selected file and cancels any in-progress upload
   */
  const handleRemoveFile = useCallback(() => {
    cancelUpload()
    setSelectedFile(null)
    setFileType(null)
    setUploadedUrl(null)
  }, [cancelUpload])

  /**
   * Retries a failed upload
   */
  const handleRetryUpload = useCallback(async () => {
    if (selectedFile) {
      setUploadedUrl(null)
      await upload(selectedFile)
    }
  }, [selectedFile, upload])

  const handleVoiceNoteComplete = useCallback(
    async (audioBlob: Blob, duration: number) => {
      const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, {
        type: "audio/webm",
      })

      // Upload the voice note
      const url = await upload(audioFile)

      if (url) {
        onSend({
          type: "audio",
          content: `Voice note (${formatDuration(duration)})`,
          mediaUrl: url,
        })
      }

      setIsRecording(false)
    },
    [onSend, upload]
  )

  const handleTemplateSelect = useCallback(
    (_templateId: string, _templateName: string, content: string) => {
      onSend({ type: "template", content })
    },
    [onSend]
  )

  // Interactive message handlers
  const handleSendListMessage = useCallback(
    (data: InteractiveListMessage) => {
      onSend({
        type: "interactive_list",
        content: data.body,
        interactiveList: data,
      })
    },
    [onSend]
  )

  const handleSendButtonsMessage = useCallback(
    (data: InteractiveButtonsMessage) => {
      onSend({
        type: "interactive_buttons",
        content: data.body,
        interactiveButtons: data,
      })
    },
    [onSend]
  )

  const handleSendLocation = useCallback(
    (data: LocationMessage) => {
      onSend({
        type: "location",
        content: data.name || `${data.latitude}, ${data.longitude}`,
        location: data,
      })
    },
    [onSend]
  )

  const handleSendContact = useCallback(
    (data: ContactMessage) => {
      onSend({
        type: "contacts",
        content: data.name.formatted_name,
        contact: data,
      })
    },
    [onSend]
  )

  const handleOpenTemplateSelector = useCallback(() => {
    setTemplateSelectorOpen(true)
  }, [])

  // Can send if we have text or a successfully uploaded file
  const canSend = (message.trim() || uploadedUrl) && !isUploading
  const isInputDisabled = disabled || isRecording
  const hasUploadError = uploadStatus === "error"

  return (
    <div className="border-t bg-background">
      {/* File preview / Upload progress */}
      {selectedFile && (
        <div className="px-4 pt-3">
          {isUploading || hasUploadError ? (
            // Show upload progress or error
            <MediaUploadProgress
              progress={progress}
              fileName={selectedFile.name}
              fileSize={selectedFile.size}
              onCancel={handleRemoveFile}
              error={uploadError}
              onRetry={handleRetryUpload}
            />
          ) : (
            // Show file preview when upload is complete
            <div className="inline-flex items-center gap-2 bg-muted rounded-md px-3 py-2">
              {fileType === "image" ? (
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm truncate max-w-[200px]">
                {selectedFile.name}
              </span>
              <span className="text-xs text-muted-foreground">
                ({formatFileSize(selectedFile.size)})
              </span>
              {uploadedUrl && (
                <span className="text-xs text-green-600">Uploaded</span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleRemoveFile}
                className="h-6 w-6 ml-1"
                aria-label="Remove attachment"
              >
                <span className="text-muted-foreground hover:text-foreground">
                  &times;
                </span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 p-3">
        {/* Emoji picker */}
        <EmojiPicker
          onEmojiSelect={handleEmojiSelect}
          className={cn(isInputDisabled && "opacity-50 pointer-events-none")}
        />

        {/* Attachment dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={isInputDisabled || isUploading}
              className="h-9 w-9 shrink-0"
              aria-label="Add attachment"
            >
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top">
            <DropdownMenuItem onClick={handleImageSelect}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDocumentSelect}>
              <FileText className="h-4 w-4 mr-2" />
              Document
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Interactive message menu */}
        <InteractiveMessageMenu
          onSendList={handleSendListMessage}
          onSendButtons={handleSendButtonsMessage}
          onSendLocation={handleSendLocation}
          onSendContact={handleSendContact}
          disabled={isInputDisabled}
        />

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          onChange={(e) => handleFileChange(e, "image")}
          className="hidden"
          aria-hidden="true"
        />
        <input
          ref={documentInputRef}
          type="file"
          accept={ACCEPTED_DOCUMENT_TYPES}
          onChange={(e) => handleFileChange(e, "document")}
          className="hidden"
          aria-hidden="true"
        />

        {/* Message textarea */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isInputDisabled}
            className={cn(
              "min-h-[40px] max-h-[150px] py-2.5 pr-10 resize-none",
              "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
            )}
            rows={1}
          />
        </div>

        {/* Voice note button */}
        <VoiceNoteButton
          onRecordComplete={handleVoiceNoteComplete}
          disabled={disabled}
        />

        {/* Template button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={isInputDisabled}
          onClick={handleOpenTemplateSelector}
          className="h-9 w-9 shrink-0"
          aria-label="Select template"
        >
          <LayoutTemplate className="h-5 w-5 text-muted-foreground" />
        </Button>

        {/* Send button */}
        <Button
          type="button"
          size="icon"
          disabled={!canSend || isInputDisabled}
          onClick={handleSendMessage}
          className="h-9 w-9 shrink-0"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Template selector dialog */}
      <TemplateSelector
        open={templateSelectorOpen}
        onOpenChange={setTemplateSelectorOpen}
        onSelect={handleTemplateSelect}
      />
    </div>
  )
}

// Utility function - formatFileSize is now imported from media-upload.service

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}
