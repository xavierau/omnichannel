import { MoreHorizontal, Pencil, Trash2, Users, Radio } from 'lucide-react'

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import type { Team } from '@/services/team.service'

interface TeamCardProps {
  team: Team
  onEdit: (team: Team) => void
  onDelete: (team: Team) => void
  onViewDetails: (team: Team) => void
}

export function TeamCard({
  team,
  onEdit,
  onDelete,
  onViewDetails,
}: TeamCardProps) {
  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <button
              type="button"
              onClick={() => onViewDetails(team)}
              className="text-left hover:underline focus:outline-none focus:underline"
            >
              <CardTitle className="text-base truncate">{team.name}</CardTitle>
            </button>
            <CardDescription className="mt-1 line-clamp-2">
              {team.description || 'No description'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={team.isActive ? 'default' : 'secondary'}>
              {team.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(team)}>
                  <Pencil className="size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(team)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="size-4" />
            <span>{team.memberCount} members</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Radio className="size-4" />
            <span>{team.channelAccountCount} channels</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
