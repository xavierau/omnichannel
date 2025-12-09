import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TeamChannelAccount } from '@/services/team.service'

interface ChannelAccountListItemProps {
  channelAccount: TeamChannelAccount
  onRemove: () => void
}

const channelTypeConfig: Record<string, { label: string; className: string }> = {
  whatsapp: {
    label: 'WhatsApp',
    className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25',
  },
  messenger: {
    label: 'Messenger',
    className: 'bg-blue-500/15 text-blue-600 border-blue-500/25',
  },
  telegram: {
    label: 'Telegram',
    className: 'bg-sky-500/15 text-sky-600 border-sky-500/25',
  },
  webchat: {
    label: 'Web Chat',
    className: 'bg-purple-500/15 text-purple-600 border-purple-500/25',
  },
  email: {
    label: 'Email',
    className: 'bg-amber-500/15 text-amber-600 border-amber-500/25',
  },
}

const statusConfig: Record<string, { label: string; className: string }> = {
  connected: {
    label: 'Connected',
    className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25',
  },
  not_connected: {
    label: 'Not Connected',
    className: 'bg-slate-500/15 text-slate-600 border-slate-500/25',
  },
  error: {
    label: 'Error',
    className: 'bg-red-500/15 text-red-600 border-red-500/25',
  },
}

function getChannelConfig(channelCode: string) {
  return (
    channelTypeConfig[channelCode.toLowerCase()] ?? {
      label: channelCode,
      className: 'bg-slate-500/15 text-slate-600 border-slate-500/25',
    }
  )
}

function getStatusConfig(status: string) {
  return (
    statusConfig[status.toLowerCase()] ?? {
      label: status,
      className: 'bg-slate-500/15 text-slate-600 border-slate-500/25',
    }
  )
}

export function ChannelAccountListItem({
  channelAccount,
  onRemove,
}: ChannelAccountListItemProps) {
  const { channelAccount: account } = channelAccount
  const channelConfig = getChannelConfig(account.channelCode)
  const statusInfo = getStatusConfig(account.status)

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 bg-card">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{account.name}</span>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
              channelConfig.className
            )}
          >
            {channelConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
              statusInfo.className
            )}
          >
            {statusInfo.label}
          </span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="size-4" />
        <span className="sr-only">Remove channel account</span>
      </Button>
    </div>
  )
}
