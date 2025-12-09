import { useState } from 'react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { TeamForm, type TeamFormData } from './TeamForm'
import { teamService, type Team } from '@/services/team.service'

interface EditTeamDialogProps {
  team: Team | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTeamUpdated: () => void
}

export function EditTeamDialog({
  team,
  open,
  onOpenChange,
  onTeamUpdated,
}: EditTeamDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(data: TeamFormData) {
    if (!team) return

    setIsSubmitting(true)
    try {
      await teamService.updateTeam(team.id, {
        name: data.name,
        description: data.description || undefined,
      })
      toast.success('Team updated', {
        description: `Team "${data.name}" has been updated successfully.`,
      })
      onOpenChange(false)
      onTeamUpdated()
    } catch (err) {
      const error = err as Error
      toast.error('Failed to update team', {
        description: error.message || 'Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCancel() {
    onOpenChange(false)
  }

  // Reset form when team changes by using key prop on TeamForm
  const initialValues = team
    ? { name: team.name, description: team.description ?? '' }
    : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
          <DialogDescription>
            Update the team name and description.
          </DialogDescription>
        </DialogHeader>
        {team && (
          <TeamForm
            key={team.id}
            initialValues={initialValues}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            submitLabel="Save Changes"
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
