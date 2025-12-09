import { useEffect, useState, useCallback } from 'react'
import { UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EmptyState } from '@/components/ui/empty-state'
import { MemberListItem } from './MemberListItem'
import { AddMemberDialog } from './AddMemberDialog'
import {
  teamService,
  TeamMemberRole,
  type TeamMember,
} from '@/services/team.service'

interface MembersTabProps {
  teamId: string
  onMembersChanged: () => void
}

export function MembersTab({ teamId, onMembersChanged }: MembersTabProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const fetchMembers = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await teamService.getTeamMembers(teamId)
      setMembers(data)
    } catch (error) {
      toast.error('Failed to load team members')
      console.error('Error fetching team members:', error)
    } finally {
      setIsLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const leaderCount = members.filter(
    (m) => m.role === TeamMemberRole.LEADER
  ).length

  async function handleRoleChange(member: TeamMember, newRole: TeamMemberRole) {
    try {
      await teamService.updateMemberRole(teamId, member.userId, newRole)
      toast.success('Member role updated')
      fetchMembers()
      onMembersChanged()
    } catch (error) {
      toast.error('Failed to update member role')
      console.error('Error updating member role:', error)
    }
  }

  async function handleRemoveMember(member: TeamMember) {
    try {
      await teamService.removeTeamMember(teamId, member.userId)
      toast.success('Member removed from team')
      fetchMembers()
      onMembersChanged()
    } catch (error) {
      toast.error('Failed to remove member')
      console.error('Error removing member:', error)
    }
  }

  function handleMemberAdded() {
    fetchMembers()
    onMembersChanged()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-8">
        <div className="text-muted-foreground">Loading members...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between py-4">
        <span className="text-sm text-muted-foreground">
          {members.length} {members.length === 1 ? 'member' : 'members'}
        </span>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <UserPlus className="size-4 mr-2" />
          Add Member
        </Button>
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={<Users className="size-8 text-muted-foreground" />}
          title="No members yet"
          description="Add team members to collaborate on conversations."
          action={
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <UserPlus className="size-4 mr-2" />
              Add Member
            </Button>
          }
        />
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-4">
            {members.map((member) => (
              <MemberListItem
                key={member.id}
                member={member}
                onRoleChange={(role) => handleRoleChange(member, role)}
                onRemove={() => handleRemoveMember(member)}
                isOnlyLeader={
                  member.role === TeamMemberRole.LEADER && leaderCount === 1
                }
              />
            ))}
          </div>
        </ScrollArea>
      )}

      <AddMemberDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        teamId={teamId}
        existingMemberIds={members.map((m) => m.userId)}
        onMemberAdded={handleMemberAdded}
      />
    </div>
  )
}
