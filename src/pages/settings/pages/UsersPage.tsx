import { useState } from 'react'
import { UserPlus } from 'lucide-react'

import { InviteUserDialog } from '@/components/InviteUserDialog'
import { PendingInvitations } from '../components/PendingInvitations'
import { Button } from '@/components/ui/button'

export function UsersPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  function handleInvitationSent() {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage team members and their permissions
          </p>
        </div>
        <InviteUserDialog
          onInvitationSent={handleInvitationSent}
          trigger={
            <Button>
              <UserPlus className="mr-2 size-4" />
              Invite user
            </Button>
          }
        />
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">Pending Invitations</h2>
          <p className="text-sm text-muted-foreground">
            Invitations that have been sent but not yet accepted
          </p>
        </div>
        <PendingInvitations refreshTrigger={refreshTrigger} />
      </div>
    </div>
  )
}
