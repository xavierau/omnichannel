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
import type { MessageType } from "../types"
import { cn } from "@/lib/utils"

interface MessageInputProps {
  onSend: (content: string, type: MessageType, attachment?: File) => void
  disabled?: boolean
  placeholder?: string
}

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/gif,image/webp"
const ACCEPTED_DOCUMENT_TYPES =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
}: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<"image" | "document" | null>(null)
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Auto-resize textarea based on content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto"
    // Set the height to scrollHeight, but cap it at max-height
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
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }, [])

  const handleSendMessage = useCallback(() => {
    const trimmedMessage = message.trim()

    if (!trimmedMessage && !selectedFile) return

    if (selectedFile && fileType) {
      // Send with attachment
      onSend(trimmedMessage || selectedFile.name, fileType, selectedFile)
    } else if (trimmedMessage) {
      // Send text only
      onSend(trimmedMessage, "text")
    }

    resetInput()
    textareaRef.current?.focus()
  }, [message, selectedFile, fileType, onSend, resetInput])

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

    // Insert emoji at cursor position
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value

    setMessage(text.substring(0, start) + emoji + text.substring(end))

    // Move cursor after emoji
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

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>, type: "image" | "document") => {
      const file = e.target.files?.[0]
      if (file) {
        setSelectedFile(file)
        setFileType(type)
      }
      // Reset the input so the same file can be selected again
      e.target.value = ""
    },
    []
  )

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null)
    setFileType(null)
  }, [])

  const handleVoiceNoteComplete = useCallback(
    (audioBlob: Blob, duration: number) => {
      // Create a File from the Blob
      const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, {
        type: "audio/webm",
      })
      onSend(`Voice note (${formatDuration(duration)})`, "audio", audioFile)
      setIsRecording(false)
    },
    [onSend]
  )

  const handleTemplateSelect = useCallback(
    (_templateId: string, _templateName: string, content: string) => {
      // Send the template message
      // templateId and templateName could be used for analytics or message metadata
      onSend(content, "template")
    },
    [onSend]
  )

  const handleOpenTemplateSelector = useCallback(() => {
    setTemplateSelectorOpen(true)
  }, [])

  const canSend = message.trim() || selectedFile
  const isInputDisabled = disabled || isRecording

  return (
    <div className="border-t bg-background">
      {/* File preview */}
      {selectedFile && (
        <div className="px-4 pt-3">
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
              disabled={isInputDisabled}
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

// Utility functions

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}
