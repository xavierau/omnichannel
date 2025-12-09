import { useState, useEffect, useCallback } from 'react'
import { UsersRound, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { teamService, type Team } from '@/services/team.service'
import {
  TeamList,
  CreateTeamDialog,
  EditTeamDialog,
  TeamDetailSheet,
} from '../components/teams'

export function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null)

  const fetchTeams = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await teamService.getTeams()
      setTeams(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  const handleTeamClick = (team: Team) => {
    setSelectedTeam(team)
    setIsDetailSheetOpen(true)
  }

  const handleEdit = (team: Team) => {
    setEditingTeam(team)
  }

  const handleDelete = (team: Team) => {
    setDeletingTeam(team)
  }

  const confirmDelete = async () => {
    if (!deletingTeam) return
    try {
      await teamService.deleteTeam(deletingTeam.id)
      toast.success('Team deleted successfully')
      setDeletingTeam(null)
      fetchTeams()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete team')
      throw err // Re-throw so ConfirmDialog can handle loading state
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
          <p className="text-muted-foreground">
            Manage teams, members, and channel account access
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} disabled={isLoading}>
          <Plus className="mr-2 size-4" />
          Create Team
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-4">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-destructive/10 p-4 mb-4">
            <UsersRound className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-medium">Failed to load teams</h3>
          <p className="text-muted-foreground mt-1 mb-4">{error}</p>
          <Button onClick={fetchTeams} variant="outline">
            Try Again
          </Button>
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <UsersRound className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No teams yet</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            Create your first team to organize members and manage channel access
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 size-4" />
            Create Team
          </Button>
        </div>
      ) : (
        <TeamList
          teams={teams}
          onViewDetails={handleTeamClick}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <CreateTeamDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onTeamCreated={fetchTeams}
      />

      {editingTeam && (
        <EditTeamDialog
          open={!!editingTeam}
          onOpenChange={(open) => !open && setEditingTeam(null)}
          team={editingTeam}
          onTeamUpdated={fetchTeams}
        />
      )}

      <ConfirmDialog
        open={!!deletingTeam}
        onOpenChange={(open) => !open && setDeletingTeam(null)}
        title="Delete Team"
        description={`Are you sure you want to delete "${deletingTeam?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
        variant="destructive"
      />

      {selectedTeam && (
        <TeamDetailSheet
          open={isDetailSheetOpen}
          onOpenChange={setIsDetailSheetOpen}
          team={selectedTeam}
          onTeamUpdated={fetchTeams}
        />
      )}
    </div>
  )
}
