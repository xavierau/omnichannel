import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  channelAccountService,
  type ChannelAccount,
} from '@/services/channel-account.service'
import { teamService } from '@/services/team.service'

interface AddChannelAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  existingChannelAccountIds: string[]
  onChannelAccountAdded: () => void
}

const CHANNEL_TYPE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  messenger: 'Messenger',
  instagram: 'Instagram',
  telegram: 'Telegram',
  sms: 'SMS',
  email: 'Email',
}

export function AddChannelAccountDialog({
  open,
  onOpenChange,
  teamId,
  existingChannelAccountIds,
  onChannelAccountAdded,
}: AddChannelAccountDialogProps) {
  const [channelAccounts, setChannelAccounts] = useState<ChannelAccount[]>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchChannelAccounts = useCallback(async () => {
    setIsLoadingAccounts(true)
    try {
      const accounts = await channelAccountService.getChannelAccounts()
      setChannelAccounts(accounts)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load channel accounts'
      toast.error(message)
    } finally {
      setIsLoadingAccounts(false)
    }
  }, [])

  // Fetch channel accounts when dialog opens
  useEffect(() => {
    if (open) {
      fetchChannelAccounts()
      // Reset form state
      setSelectedAccountId('')
    }
  }, [open, fetchChannelAccounts])

  // Filter out accounts already assigned to the team
  const availableAccounts = channelAccounts.filter(
    (account) => !existingChannelAccountIds.includes(account.id)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedAccountId) {
      toast.error('Please select a channel account')
      return
    }

    setIsSubmitting(true)
    try {
      await teamService.addTeamChannelAccount(teamId, selectedAccountId)
      toast.success('Channel account added successfully')
      onChannelAccountAdded()
      onOpenChange(false)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to add channel account'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getChannelTypeLabel = (channelCode: string): string => {
    return CHANNEL_TYPE_LABELS[channelCode.toLowerCase()] || channelCode
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Channel Account</DialogTitle>
          <DialogDescription>
            Grant this team access to a channel account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channel-account-select">Channel Account</Label>
            <Select
              value={selectedAccountId}
              onValueChange={setSelectedAccountId}
              disabled={isLoadingAccounts || isSubmitting}
            >
              <SelectTrigger id="channel-account-select" className="w-full">
                <SelectValue
                  placeholder={
                    isLoadingAccounts
                      ? 'Loading accounts...'
                      : 'Select a channel account'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableAccounts.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    {isLoadingAccounts
                      ? 'Loading...'
                      : 'No available channel accounts to add'}
                  </div>
                ) : (
                  availableAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex flex-col">
                        <span>{account.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {getChannelTypeLabel(account.channelCode)}
                          {account.phoneNumber && ` - ${account.phoneNumber}`}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedAccountId || isSubmitting || isLoadingAccounts}
            >
              {isSubmitting ? 'Adding...' : 'Add Channel Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
