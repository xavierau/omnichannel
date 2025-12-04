import { MessageCircle, Instagram, Facebook, Send, Mail, Phone } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { AVAILABLE_CHANNELS, type ChannelType } from "../types"

interface AddChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectChannel: (channelType: ChannelType) => void
}

const iconMap: Record<string, React.ElementType> = {
  MessageCircle,
  Instagram,
  Facebook,
  Send,
  Mail,
  Phone,
}

export function AddChannelDialog({
  open,
  onOpenChange,
  onSelectChannel,
}: AddChannelDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Channel</DialogTitle>
          <DialogDescription>
            Select a messaging channel to add to your platform
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {AVAILABLE_CHANNELS.map((channel) => {
            const Icon = iconMap[channel.icon] || MessageCircle
            const isAvailable = channel.available

            return (
              <button
                key={channel.type}
                onClick={() => isAvailable && onSelectChannel(channel.type)}
                disabled={!isAvailable}
                className={cn(
                  "flex items-center gap-4 rounded-lg border p-4 text-left transition-colors",
                  isAvailable
                    ? "hover:bg-muted cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{channel.name}</span>
                    {!isAvailable && (
                      <span className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {channel.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
