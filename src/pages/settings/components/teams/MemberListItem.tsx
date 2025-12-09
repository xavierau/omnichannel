import { MoreHorizontal, Shield, User, UserMinus } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TeamMemberRole, type TeamMember } from '@/services/team.service'

interface MemberListItemProps {
  member: TeamMember
  onRoleChange: (role: TeamMemberRole) => void
  onRemove: () => void
  isOnlyLeader?: boolean
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

function getFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim()
}

export function MemberListItem({
  member,
  onRoleChange,
  onRemove,
  isOnlyLeader = false,
}: MemberListItemProps) {
  const { user, role } = member
  const fullName = getFullName(user.firstName, user.lastName)
  const initials = getInitials(user.firstName, user.lastName)
  const isLeader = role === TeamMemberRole.LEADER

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 bg-card">
      <Avatar className="size-10">
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{fullName}</span>
          <Badge
            variant={isLeader ? 'default' : 'secondary'}
            className="capitalize"
          >
            {isLeader && <Shield className="size-3 mr-1" />}
            {role}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Shield className="size-4 mr-2" />
              Change Role
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => onRoleChange(TeamMemberRole.LEADER)}
                disabled={isLeader}
              >
                <Shield className="size-4 mr-2" />
                Leader
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onRoleChange(TeamMemberRole.MEMBER)}
                disabled={!isLeader || isOnlyLeader}
              >
                <User className="size-4 mr-2" />
                Member
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={onRemove}
            disabled={isOnlyLeader}
          >
            <UserMinus className="size-4 mr-2" />
            Remove from Team
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
