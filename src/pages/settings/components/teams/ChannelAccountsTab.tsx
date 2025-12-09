import { useEffect, useState, useCallback } from 'react'
import { Plus, Radio } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EmptyState } from '@/components/ui/empty-state'
import { ChannelAccountListItem } from './ChannelAccountListItem'
import { AddChannelAccountDialog } from './AddChannelAccountDialog'
import { teamService, type TeamChannelAccount } from '@/services/team.service'

interface ChannelAccountsTabProps {
  teamId: string
  onChannelAccountsChanged: () => void
}

export function ChannelAccountsTab({
  teamId,
  onChannelAccountsChanged,
}: ChannelAccountsTabProps) {
  const [channelAccounts, setChannelAccounts] = useState<TeamChannelAccount[]>(
    []
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const fetchChannelAccounts = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await teamService.getTeamChannelAccounts(teamId)
      setChannelAccounts(data)
    } catch (error) {
      toast.error('Failed to load channel accounts')
      console.error('Error fetching channel accounts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    fetchChannelAccounts()
  }, [fetchChannelAccounts])

  async function handleRemoveChannelAccount(
    channelAccount: TeamChannelAccount
  ) {
    try {
      await teamService.removeTeamChannelAccount(
        teamId,
        channelAccount.channelAccountId
      )
      toast.success('Channel account removed from team')
      fetchChannelAccounts()
      onChannelAccountsChanged()
    } catch (error) {
      toast.error('Failed to remove channel account')
      console.error('Error removing channel account:', error)
    }
  }

  function handleChannelAccountAdded() {
    fetchChannelAccounts()
    onChannelAccountsChanged()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-8">
        <div className="text-muted-foreground">Loading channel accounts...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between py-4">
        <span className="text-sm text-muted-foreground">
          {channelAccounts.length}{' '}
          {channelAccounts.length === 1 ? 'channel account' : 'channel accounts'}
        </span>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="size-4 mr-2" />
          Add Channel Account
        </Button>
      </div>

      {channelAccounts.length === 0 ? (
        <EmptyState
          icon={<Radio className="size-8 text-muted-foreground" />}
          title="No channel accounts assigned"
          description="Assign channel accounts to allow this team to handle conversations."
          action={
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="size-4 mr-2" />
              Add Channel Account
            </Button>
          }
        />
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-4">
            {channelAccounts.map((channelAccount) => (
              <ChannelAccountListItem
                key={channelAccount.id}
                channelAccount={channelAccount}
                onRemove={() => handleRemoveChannelAccount(channelAccount)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      <AddChannelAccountDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        teamId={teamId}
        existingChannelAccountIds={channelAccounts.map((ca) => ca.channelAccountId)}
        onChannelAccountAdded={handleChannelAccountAdded}
      />
    </div>
  )
}
