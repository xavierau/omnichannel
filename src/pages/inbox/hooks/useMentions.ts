import { useState, useCallback, useMemo } from "react"
import type { Operator, NoteMention } from "../types"

interface UseMentionsOptions {
  operators: Operator[]
}

interface UseMentionsReturn {
  showSuggestions: boolean
  suggestions: Operator[]
  suggestionQuery: string
  handleInputChange: (value: string, cursorPos: number) => void
  parseMentions: (content: string) => NoteMention[]
  insertMention: (
    operator: Operator,
    currentValue: string,
    cursorPos: number
  ) => { newValue: string; newCursorPos: number }
  closeSuggestions: () => void
}

/**
 * Extracts the mention query from text at the given cursor position.
 * Returns the text after @ if the cursor is within a mention being typed.
 *
 * @param value - The full text content
 * @param cursorPos - Current cursor position in the text
 * @returns The query string after @ or null if not in a mention context
 */
function extractMentionQuery(value: string, cursorPos: number): string | null {
  // Look backwards from cursor to find @
  const textBeforeCursor = value.slice(0, cursorPos)

  // Find the last @ before cursor
  const lastAtIndex = textBeforeCursor.lastIndexOf("@")

  if (lastAtIndex === -1) {
    return null
  }

  // Check if there's a space between @ and cursor (meaning the mention is complete)
  const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)

  // If @ is at the start or preceded by whitespace, it's a valid mention trigger
  const charBeforeAt = lastAtIndex > 0 ? value[lastAtIndex - 1] : " "
  if (!/\s/.test(charBeforeAt) && lastAtIndex !== 0) {
    return null
  }

  // Return the query (text after @)
  return textAfterAt
}

/**
 * Custom hook for @mention detection and autocomplete functionality.
 *
 * Provides:
 * - Detection of @ trigger character in textarea input
 * - Filtering of operators based on typed query
 * - Parsing of content to extract mention positions
 * - Insertion of selected operator names
 *
 * @param options - Configuration object containing available operators
 * @returns Object with mention state and handler functions
 *
 * @example
 * ```tsx
 * const {
 *   showSuggestions,
 *   suggestions,
 *   handleInputChange,
 *   insertMention,
 *   closeSuggestions
 * } = useMentions({ operators })
 *
 * <textarea
 *   onChange={(e) => handleInputChange(e.target.value, e.target.selectionStart)}
 * />
 * {showSuggestions && (
 *   <SuggestionList
 *     suggestions={suggestions}
 *     onSelect={(op) => {
 *       const { newValue } = insertMention(op, value, cursorPos)
 *       setValue(newValue)
 *     }}
 *   />
 * )}
 * ```
 */
export function useMentions({
  operators,
}: UseMentionsOptions): UseMentionsReturn {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionQuery, setSuggestionQuery] = useState("")
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1)

  /**
   * Filters operators based on the current query.
   * Matches partial names case-insensitively.
   */
  const suggestions = useMemo(() => {
    if (!showSuggestions || !suggestionQuery) {
      return operators
    }

    const query = suggestionQuery.toLowerCase()
    return operators.filter((operator) =>
      operator.name.toLowerCase().includes(query)
    )
  }, [operators, showSuggestions, suggestionQuery])

  /**
   * Handles input changes and detects mention triggers.
   * Call this on every textarea change with current value and cursor position.
   */
  const handleInputChange = useCallback(
    (value: string, cursorPos: number) => {
      const query = extractMentionQuery(value, cursorPos)

      if (query !== null) {
        // Find where the @ symbol is
        const textBeforeCursor = value.slice(0, cursorPos)
        const lastAtIndex = textBeforeCursor.lastIndexOf("@")

        setShowSuggestions(true)
        setSuggestionQuery(query)
        setMentionStartIndex(lastAtIndex)
      } else {
        setShowSuggestions(false)
        setSuggestionQuery("")
        setMentionStartIndex(-1)
      }
    },
    []
  )

  /**
   * Parses content to find all @mentions and their positions.
   * Used for highlighting mentions in the display.
   *
   * @param content - The text content to parse
   * @returns Array of NoteMention objects with position data
   */
  const parseMentions = useCallback(
    (content: string): NoteMention[] => {
      const mentions: NoteMention[] = []

      // Build a regex pattern that matches @OperatorName for all operators
      // Sort by name length descending to match longer names first
      const sortedOperators = [...operators].sort(
        (a, b) => b.name.length - a.name.length
      )

      for (const operator of sortedOperators) {
        // Escape special regex characters in operator name
        const escapedName = operator.name.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        )
        const pattern = new RegExp(`@${escapedName}`, "g")

        let match
        while ((match = pattern.exec(content)) !== null) {
          const startIndex = match.index
          const endIndex = startIndex + match[0].length

          // Check if this position overlaps with an already found mention
          const overlaps = mentions.some(
            (m) =>
              (startIndex >= m.startIndex && startIndex < m.endIndex) ||
              (endIndex > m.startIndex && endIndex <= m.endIndex)
          )

          if (!overlaps) {
            mentions.push({
              operatorId: operator.id,
              operatorName: operator.name,
              startIndex,
              endIndex,
            })
          }
        }
      }

      // Sort by position for consistent ordering
      return mentions.sort((a, b) => a.startIndex - b.startIndex)
    },
    [operators]
  )

  /**
   * Inserts the selected operator's mention at the current position.
   * Replaces the partial @query with the full @OperatorName.
   *
   * @param operator - The selected operator to mention
   * @param currentValue - Current textarea value
   * @param cursorPos - Current cursor position
   * @returns New value with mention inserted and new cursor position
   */
  const insertMention = useCallback(
    (
      operator: Operator,
      currentValue: string,
      cursorPos: number
    ): { newValue: string; newCursorPos: number } => {
      if (mentionStartIndex === -1) {
        // Fallback: insert at cursor if we don't have the start index
        const mention = `@${operator.name} `
        const newValue =
          currentValue.slice(0, cursorPos) +
          mention +
          currentValue.slice(cursorPos)
        return {
          newValue,
          newCursorPos: cursorPos + mention.length,
        }
      }

      // Replace from @ to cursor with the full mention
      const mention = `@${operator.name} `
      const beforeMention = currentValue.slice(0, mentionStartIndex)
      const afterCursor = currentValue.slice(cursorPos)
      const newValue = beforeMention + mention + afterCursor
      const newCursorPos = mentionStartIndex + mention.length

      // Reset state
      setShowSuggestions(false)
      setSuggestionQuery("")
      setMentionStartIndex(-1)

      return { newValue, newCursorPos }
    },
    [mentionStartIndex]
  )

  /**
   * Closes the suggestions dropdown without inserting a mention.
   */
  const closeSuggestions = useCallback(() => {
    setShowSuggestions(false)
    setSuggestionQuery("")
    setMentionStartIndex(-1)
  }, [])

  return {
    showSuggestions,
    suggestions,
    suggestionQuery,
    handleInputChange,
    parseMentions,
    insertMention,
    closeSuggestions,
  }
}
