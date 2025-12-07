import { useState, useCallback } from "react"
import { List, MousePointerClick, MapPin, Users, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { ListMessageComposer } from "./ListMessageComposer"
import { ButtonMessageComposer } from "./ButtonMessageComposer"
import { LocationPicker } from "./LocationPicker"
import { ContactPicker } from "./ContactPicker"
import type {
  InteractiveListMessage,
  InteractiveButtonsMessage,
  LocationMessage,
  ContactMessage,
} from "../types"

type InteractiveType = "list" | "buttons" | "location" | "contact"

interface InteractiveMessageMenuProps {
  onSendList: (data: InteractiveListMessage) => void
  onSendButtons: (data: InteractiveButtonsMessage) => void
  onSendLocation: (data: LocationMessage) => void
  onSendContact: (data: ContactMessage) => void
  disabled?: boolean
}

/**
 * Dropdown menu for selecting and composing interactive WhatsApp messages.
 * Provides options for list messages, button messages, location sharing, and contacts.
 */
export function InteractiveMessageMenu({
  onSendList,
  onSendButtons,
  onSendLocation,
  onSendContact,
  disabled = false,
}: InteractiveMessageMenuProps) {
  const [openComposer, setOpenComposer] = useState<InteractiveType | null>(null)

  const handleOpenComposer = useCallback((type: InteractiveType) => {
    setOpenComposer(type)
  }, [])

  const handleCloseComposer = useCallback(() => {
    setOpenComposer(null)
  }, [])

  const handleSendList = useCallback(
    (data: InteractiveListMessage) => {
      onSendList(data)
      setOpenComposer(null)
    },
    [onSendList]
  )

  const handleSendButtons = useCallback(
    (data: InteractiveButtonsMessage) => {
      onSendButtons(data)
      setOpenComposer(null)
    },
    [onSendButtons]
  )

  const handleSendLocation = useCallback(
    (data: LocationMessage) => {
      onSendLocation(data)
      setOpenComposer(null)
    },
    [onSendLocation]
  )

  const handleSendContact = useCallback(
    (data: ContactMessage) => {
      onSendContact(data)
      setOpenComposer(null)
    },
    [onSendContact]
  )

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="h-9 w-9 shrink-0"
            aria-label="Interactive messages"
          >
            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top">
          <DropdownMenuLabel>Interactive Messages</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleOpenComposer("list")}>
            <List className="h-4 w-4 mr-2" />
            List Message
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleOpenComposer("buttons")}>
            <MousePointerClick className="h-4 w-4 mr-2" />
            Button Message
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleOpenComposer("location")}>
            <MapPin className="h-4 w-4 mr-2" />
            Location
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleOpenComposer("contact")}>
            <Users className="h-4 w-4 mr-2" />
            Contact
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Composer dialogs */}
      <ListMessageComposer
        open={openComposer === "list"}
        onOpenChange={(open) => !open && handleCloseComposer()}
        onSend={handleSendList}
      />

      <ButtonMessageComposer
        open={openComposer === "buttons"}
        onOpenChange={(open) => !open && handleCloseComposer()}
        onSend={handleSendButtons}
      />

      <LocationPicker
        open={openComposer === "location"}
        onOpenChange={(open) => !open && handleCloseComposer()}
        onSend={handleSendLocation}
      />

      <ContactPicker
        open={openComposer === "contact"}
        onOpenChange={(open) => !open && handleCloseComposer()}
        onSend={handleSendContact}
      />
    </>
  )
}
