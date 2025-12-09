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
import { apiGet } from '@/services/api-client'
import type { ApiResponse } from '@/services/api-client'
import { teamService, TeamMemberRole } from '@/services/team.service'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
}

interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  existingMemberIds: string[]
  onMemberAdded: () => void
}

export function AddMemberDialog({
  open,
  onOpenChange,
  teamId,
  existingMemberIds,
  onMemberAdded,
}: AddMemberDialogProps) {
  const [users, setUsers] = useState<User[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<TeamMemberRole>(TeamMemberRole.MEMBER)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true)
    try {
      const response = await apiGet<ApiResponse<User[]>>('/api/users')
      setUsers(response.data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load users'
      toast.error(message)
    } finally {
      setIsLoadingUsers(false)
    }
  }, [])

  // Fetch users when dialog opens
  useEffect(() => {
    if (open) {
      fetchUsers()
      // Reset form state
      setSelectedUserId('')
      setSelectedRole(TeamMemberRole.MEMBER)
    }
  }, [open, fetchUsers])

  // Filter out users already in the team
  const availableUsers = users.filter(
    (user) => !existingMemberIds.includes(user.id)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedUserId) {
      toast.error('Please select a user')
      return
    }

    setIsSubmitting(true)
    try {
      await teamService.addTeamMember(teamId, selectedUserId, selectedRole)
      toast.success('Team member added successfully')
      onMemberAdded()
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add team member'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatUserName = (user: User): string => {
    const fullName = `${user.firstName} ${user.lastName}`.trim()
    return fullName || user.email
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Select a user and assign their role in this team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-select">User</Label>
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              disabled={isLoadingUsers || isSubmitting}
            >
              <SelectTrigger id="user-select" className="w-full">
                <SelectValue
                  placeholder={isLoadingUsers ? 'Loading users...' : 'Select a user'}
                />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    {isLoadingUsers
                      ? 'Loading...'
                      : 'No available users to add'}
                  </div>
                ) : (
                  availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex flex-col">
                        <span>{formatUserName(user)}</span>
                        {user.firstName || user.lastName ? (
                          <span className="text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        ) : null}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-select">Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as TeamMemberRole)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="role-select" className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TeamMemberRole.LEADER}>
                  <div className="flex flex-col">
                    <span>Leader</span>
                    <span className="text-xs text-muted-foreground">
                      Can manage team members and settings
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value={TeamMemberRole.MEMBER}>
                  <div className="flex flex-col">
                    <span>Member</span>
                    <span className="text-xs text-muted-foreground">
                      Standard team member access
                    </span>
                  </div>
                </SelectItem>
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
              disabled={!selectedUserId || isSubmitting || isLoadingUsers}
            >
              {isSubmitting ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
