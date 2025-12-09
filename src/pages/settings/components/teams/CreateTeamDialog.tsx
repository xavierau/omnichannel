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
import { teamService } from '@/services/team.service'

interface CreateTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTeamCreated: () => void
}

export function CreateTeamDialog({
  open,
  onOpenChange,
  onTeamCreated,
}: CreateTeamDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(data: TeamFormData) {
    setIsSubmitting(true)
    try {
      await teamService.createTeam({
        name: data.name,
        description: data.description || undefined,
      })
      toast.success('Team created', {
        description: `Team "${data.name}" has been created successfully.`,
      })
      onOpenChange(false)
      onTeamCreated()
    } catch (err) {
      const error = err as Error
      toast.error('Failed to create team', {
        description: error.message || 'Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCancel() {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
          <DialogDescription>
            Create a new team to organize members and assign channel accounts.
          </DialogDescription>
        </DialogHeader>
        <TeamForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          submitLabel="Create Team"
        />
      </DialogContent>
    </Dialog>
  )
}
