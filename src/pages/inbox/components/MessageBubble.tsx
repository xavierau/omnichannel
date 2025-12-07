import { MapPin, Phone, User, List, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { Message, InteractiveListMessage, InteractiveButtonsMessage, LocationMessage, ContactMessage } from "../types"
import { MessageStatusIndicator } from "./MessageStatusIndicator"
import { AttachmentPreview } from "./AttachmentPreview"

interface MessageBubbleProps {
  message: Message
  showOperatorName?: boolean
  onReact?: (messageId: string, emoji: string) => void
}

/**
 * WhatsApp-style message bubble component.
 * Handles different message types: text, image, document, audio, video,
 * template, system, interactive_list, interactive_buttons, location, contacts, reaction.
 * Inbound messages appear on the left with gray background.
 * Outbound messages appear on the right with green background.
 * System messages are centered with no bubble.
 */
export function MessageBubble({
  message,
  showOperatorName = false,
}: MessageBubbleProps) {
  const { direction, type, content, attachment, timestamp, status } = message

  // System messages have special centered styling
  if (type === "system") {
    return <SystemMessage content={content} timestamp={timestamp} />
  }

  // Reaction messages are displayed as overlays (handled by parent)
  if (type === "reaction") {
    return <ReactionMessage emoji={message.reaction?.emoji || ""} timestamp={timestamp} />
  }

  const isInbound = direction === "inbound"

  return (
    <div
      className={cn(
        "flex w-full group",
        isInbound ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={cn(
          "max-w-[75%] md:max-w-[65%]",
          "flex flex-col"
        )}
      >
        {/* Operator name for outbound messages */}
        {!isInbound && showOperatorName && message.operatorName && (
          <span className="text-xs text-muted-foreground mb-1 self-end">
            {message.operatorName}
          </span>
        )}

        {/* Message bubble */}
        <div
          className={cn(
            "relative rounded-lg px-3 py-2",
            "break-words",
            isInbound
              ? "bg-muted text-foreground rounded-tl-none"
              : "bg-emerald-500 text-white rounded-tr-none"
          )}
        >
          {/* Template indicator */}
          {type === "template" && message.templateName && (
            <div
              className={cn(
                "text-xs font-medium mb-1 pb-1 border-b",
                isInbound
                  ? "border-border text-muted-foreground"
                  : "border-white/30 text-white/80"
              )}
            >
              Template: {message.templateName}
            </div>
          )}

          {/* Attachment preview */}
          {attachment && (
            <div className="mb-2">
              <AttachmentPreview attachment={attachment} direction={direction} />
            </div>
          )}

          {/* Interactive List Message */}
          {type === "interactive_list" && message.interactiveList && (
            <InteractiveListContent
              data={message.interactiveList}
              isInbound={isInbound}
            />
          )}

          {/* Interactive Buttons Message */}
          {type === "interactive_buttons" && message.interactiveButtons && (
            <InteractiveButtonsContent
              data={message.interactiveButtons}
              isInbound={isInbound}
            />
          )}

          {/* Location Message */}
          {type === "location" && message.location && (
            <LocationContent data={message.location} isInbound={isInbound} />
          )}

          {/* Contacts Message */}
          {type === "contacts" && message.contacts && (
            <ContactsContent data={message.contacts} isInbound={isInbound} />
          )}

          {/* Text content (for non-interactive types or fallback) */}
          {content &&
            type !== "interactive_list" &&
            type !== "interactive_buttons" &&
            type !== "location" &&
            type !== "contacts" && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {content}
              </p>
            )}

          {/* Timestamp and status indicator */}
          <div
            className={cn(
              "flex items-center justify-end gap-1 mt-1",
              isInbound ? "text-muted-foreground" : "text-white/70"
            )}
          >
            <span className="text-[10px]">
              {formatMessageTime(timestamp)}
            </span>
            {!isInbound && (
              <MessageStatusIndicator
                status={status}
                className={cn(
                  "size-3.5",
                  status === "read" && "text-blue-200",
                  status !== "read" && status !== "failed" && "text-white/70",
                  status === "failed" && "text-red-200"
                )}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Renders interactive list message content.
 */
function InteractiveListContent({
  data,
  isInbound,
}: {
  data: InteractiveListMessage
  isInbound: boolean
}) {
  return (
    <div className="space-y-2">
      {/* Header */}
      {data.header && (
        <p
          className={cn(
            "text-sm font-semibold",
            isInbound ? "text-foreground" : "text-white"
          )}
        >
          {data.header}
        </p>
      )}

      {/* Body */}
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.body}</p>

      {/* Footer */}
      {data.footer && (
        <p
          className={cn(
            "text-xs",
            isInbound ? "text-muted-foreground" : "text-white/70"
          )}
        >
          {data.footer}
        </p>
      )}

      {/* List button indicator */}
      <div className="pt-2 border-t border-current/20">
        <Button
          variant="ghost"
          size="sm"
          disabled
          className={cn(
            "w-full justify-between",
            isInbound
              ? "text-primary hover:bg-transparent"
              : "text-white hover:bg-transparent"
          )}
        >
          <span className="flex items-center gap-2">
            <List className="h-4 w-4" />
            {data.buttonText}
          </span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Preview of sections (collapsed view) */}
      <div
        className={cn(
          "text-xs space-y-1 pt-1",
          isInbound ? "text-muted-foreground" : "text-white/70"
        )}
      >
        {data.sections.map((section, idx) => (
          <div key={idx}>
            {section.title && (
              <span className="font-medium">{section.title}: </span>
            )}
            <span>{section.rows.length} options</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Renders interactive buttons message content.
 */
function InteractiveButtonsContent({
  data,
  isInbound,
}: {
  data: InteractiveButtonsMessage
  isInbound: boolean
}) {
  return (
    <div className="space-y-2">
      {/* Header */}
      {data.header && (
        <p
          className={cn(
            "text-sm font-semibold",
            isInbound ? "text-foreground" : "text-white"
          )}
        >
          {data.header}
        </p>
      )}

      {/* Body */}
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.body}</p>

      {/* Footer */}
      {data.footer && (
        <p
          className={cn(
            "text-xs",
            isInbound ? "text-muted-foreground" : "text-white/70"
          )}
        >
          {data.footer}
        </p>
      )}

      {/* Buttons */}
      <div className="pt-2 space-y-1 border-t border-current/20">
        {data.buttons.map((button) => (
          <Button
            key={button.id}
            variant="ghost"
            size="sm"
            disabled
            className={cn(
              "w-full justify-center font-medium",
              isInbound
                ? "text-primary hover:bg-transparent border border-primary/30"
                : "text-white hover:bg-transparent border border-white/30"
            )}
          >
            {button.title}
          </Button>
        ))}
      </div>
    </div>
  )
}

/**
 * Renders location message content.
 */
function LocationContent({
  data,
  isInbound,
}: {
  data: LocationMessage
  isInbound: boolean
}) {
  const mapsUrl = `https://www.google.com/maps?q=${data.latitude},${data.longitude}`

  return (
    <div className="space-y-2">
      {/* Map placeholder */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center justify-center h-24 rounded-md",
          isInbound ? "bg-background/50" : "bg-white/10"
        )}
      >
        <MapPin
          className={cn(
            "h-8 w-8",
            isInbound ? "text-muted-foreground" : "text-white/70"
          )}
        />
      </a>

      {/* Location details */}
      <div>
        {data.name && (
          <p className="text-sm font-medium">{data.name}</p>
        )}
        {data.address && (
          <p
            className={cn(
              "text-xs",
              isInbound ? "text-muted-foreground" : "text-white/80"
            )}
          >
            {data.address}
          </p>
        )}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "text-xs underline hover:no-underline",
            isInbound ? "text-primary" : "text-white"
          )}
        >
          Open in Maps
        </a>
      </div>
    </div>
  )
}

/**
 * Renders contacts message content.
 */
function ContactsContent({
  data,
  isInbound,
}: {
  data: ContactMessage[]
  isInbound: boolean
}) {
  return (
    <div className="space-y-2">
      {data.map((contact, index) => (
        <div
          key={index}
          className={cn(
            "flex items-start gap-3 p-2 rounded-md",
            isInbound ? "bg-background/50" : "bg-white/10"
          )}
        >
          {/* Contact avatar placeholder */}
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full",
              isInbound ? "bg-muted" : "bg-white/20"
            )}
          >
            <User
              className={cn(
                "h-5 w-5",
                isInbound ? "text-muted-foreground" : "text-white/70"
              )}
            />
          </div>

          {/* Contact info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {contact.name.formatted_name}
            </p>
            {contact.phones && contact.phones.length > 0 && (
              <div className="space-y-0.5 mt-1">
                {contact.phones.map((phone, phoneIdx) => (
                  <div
                    key={phoneIdx}
                    className={cn(
                      "flex items-center gap-1 text-xs",
                      isInbound ? "text-muted-foreground" : "text-white/80"
                    )}
                  >
                    <Phone className="h-3 w-3" />
                    <span>{phone.phone}</span>
                    {phone.type && (
                      <span className="text-[10px]">({phone.type})</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * System message component - centered, italicized, no bubble.
 */
function SystemMessage({
  content,
  timestamp,
}: {
  content: string
  timestamp: Date
}) {
  return (
    <div className="flex justify-center my-2">
      <div className="bg-muted/50 rounded-lg px-3 py-1.5 max-w-[80%]">
        <p className="text-xs text-muted-foreground italic text-center">
          {content}
        </p>
        <p className="text-[10px] text-muted-foreground/70 text-center mt-0.5">
          {formatMessageTime(timestamp)}
        </p>
      </div>
    </div>
  )
}

/**
 * Reaction message component - shows emoji reaction.
 */
function ReactionMessage({
  emoji,
  timestamp,
}: {
  emoji: string
  timestamp: Date
}) {
  return (
    <div className="flex justify-center my-1">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span className="text-lg">{emoji}</span>
        <span>reacted at {formatMessageTime(timestamp)}</span>
      </div>
    </div>
  )
}

/**
 * Formats a timestamp for display in the message bubble.
 * Shows time in HH:MM format.
 */
function formatMessageTime(date: Date): string {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}
