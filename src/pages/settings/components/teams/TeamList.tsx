import { TeamCard } from './TeamCard'
import type { Team } from '@/services/team.service'

interface TeamListProps {
  teams: Team[]
  onEdit: (team: Team) => void
  onDelete: (team: Team) => void
  onViewDetails: (team: Team) => void
}

export function TeamList({
  teams,
  onEdit,
  onDelete,
  onViewDetails,
}: TeamListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  )
}
