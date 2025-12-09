import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Radio } from 'lucide-react'

import { MembersTab } from './MembersTab'
import { ChannelAccountsTab } from './ChannelAccountsTab'
import type { Team } from '@/services/team.service'

interface TeamDetailSheetProps {
  team: Team | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTeamUpdated: () => void
}

export function TeamDetailSheet({
  team,
  open,
  onOpenChange,
  onTeamUpdated,
}: TeamDetailSheetProps) {
  if (!team) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>{team.name}</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="members" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full">
            <TabsTrigger value="members" className="flex-1">
              <Users className="size-4 mr-2" />
              Members
            </TabsTrigger>
            <TabsTrigger value="channel-accounts" className="flex-1">
              <Radio className="size-4 mr-2" />
              Channel Accounts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="flex-1 overflow-hidden">
            <MembersTab teamId={team.id} onMembersChanged={onTeamUpdated} />
          </TabsContent>

          <TabsContent value="channel-accounts" className="flex-1 overflow-hidden">
            <ChannelAccountsTab
              teamId={team.id}
              onChannelAccountsChanged={onTeamUpdated}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
