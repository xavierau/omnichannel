import { useState, useRef, useCallback, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useMentions } from "../hooks/useMentions"
import type { Operator, NoteScope, CreateNoteRequest } from "../types"

interface NoteInputProps {
  conversationId: string
  customerId: string
  operators: Operator[]
  onSubmit: (request: CreateNoteRequest) => void
  editMode?: boolean
  initialContent?: string
  initialScope?: NoteScope
  onCancel?: () => void
}

/**
 * Input component for creating/editing notes with @mention autocomplete and scope selection.
 *
 * Features:
 * - Textarea for note content with controlled input
 * - Scope selector (conversation vs customer) - hidden in edit mode
 * - @mention autocomplete dropdown when typing @
 * - Submit/Cancel buttons with proper form handling
 */
export function NoteInput({
  conversationId,
  customerId,
  operators,
  onSubmit,
  editMode = false,
  initialContent = "",
  initialScope = "conversation",
  onCancel,
}: NoteInputProps) {
  const [content, setContent] = useState(initialContent)
  const [scope, setScope] = useState<NoteScope>(initialScope)
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    showSuggestions,
    suggestions,
    handleInputChange,
    parseMentions,
    insertMention,
    closeSuggestions,
  } = useMentions({ operators })

  // Reset content when initialContent changes (for edit mode)
  useEffect(() => {
    setContent(initialContent)
  }, [initialContent])

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      const cursorPos = e.target.selectionStart ?? 0

      setContent(value)
      setCursorPosition(cursorPos)
      handleInputChange(value, cursorPos)
    },
    [handleInputChange]
  )

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Update cursor position on key navigation
      const target = e.target as HTMLTextAreaElement
      setCursorPosition(target.selectionStart ?? 0)
    },
    []
  )

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLTextAreaElement>) => {
      // Update cursor position on click
      const target = e.target as HTMLTextAreaElement
      setCursorPosition(target.selectionStart ?? 0)
    },
    []
  )

  const handleSelectOperator = useCallback(
    (operator: Operator) => {
      const { newValue, newCursorPos } = insertMention(
        operator,
        content,
        cursorPosition
      )
      setContent(newValue)
      setCursorPosition(newCursorPos)

      // Focus textarea and set cursor position after state update
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
        }
      })
    },
    [content, cursorPosition, insertMention]
  )

  const handleSubmit = useCallback(() => {
    const trimmedContent = content.trim()
    if (!trimmedContent) {
      return
    }

    const mentions = parseMentions(trimmedContent)

    onSubmit({
      scope,
      conversationId,
      customerId,
      content: trimmedContent,
      mentions,
    })

    // Reset form after submit (only in create mode)
    if (!editMode) {
      setContent("")
      setCursorPosition(0)
    }
  }, [content, scope, conversationId, customerId, parseMentions, onSubmit, editMode])

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
    }
    setContent(initialContent)
    closeSuggestions()
  }, [onCancel, initialContent, closeSuggestions])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Close suggestions on Escape
      if (e.key === "Escape" && showSuggestions) {
        e.preventDefault()
        closeSuggestions()
        return
      }

      // Submit on Ctrl/Cmd + Enter
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [showSuggestions, closeSuggestions, handleSubmit]
  )

  const getOperatorInitials = (name: string): string => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const isSubmitDisabled = !content.trim()

  return (
    <div className="space-y-3">
      {/* Scope selector - only shown in create mode */}
      {!editMode && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Scope:</span>
          <Select
            value={scope}
            onValueChange={(value: NoteScope) => setScope(value)}
          >
            <SelectTrigger className="w-48" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conversation">This Conversation</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Textarea with @mention popover */}
      <div className="relative">
        <Popover open={showSuggestions} onOpenChange={(open) => !open && closeSuggestions()}>
          <PopoverAnchor asChild>
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyUp={handleKeyUp}
              onKeyDown={handleKeyDown}
              onClick={handleClick}
              placeholder="Add a note... Use @ to mention team members"
              className="min-h-24 resize-none"
              aria-label="Note content"
            />
          </PopoverAnchor>
          <PopoverContent
            className="w-64 p-0"
            align="start"
            side="bottom"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command>
              <CommandList>
                <CommandEmpty>No team members found</CommandEmpty>
                <CommandGroup heading="Team Members">
                  {suggestions.map((operator) => (
                    <CommandItem
                      key={operator.id}
                      value={operator.name}
                      onSelect={() => handleSelectOperator(operator)}
                      className="cursor-pointer"
                    >
                      <Avatar className="size-6">
                        {operator.avatar && (
                          <AvatarImage src={operator.avatar} alt={operator.name} />
                        )}
                        <AvatarFallback className="text-xs">
                          {getOperatorInitials(operator.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{operator.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        {editMode && onCancel && (
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
        >
          {editMode ? "Save" : "Add Note"}
        </Button>
      </div>
    </div>
  )
}
