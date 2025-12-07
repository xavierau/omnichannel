import { useState, useEffect, useCallback } from 'react'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import {
  Clock,
  Loader2,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  UserX,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  getInvitations,
  resendInvitation,
  cancelInvitation,
} from '@/services/invitations'
import type { Invitation } from '@/services/invitations'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface PendingInvitationsProps {
  refreshTrigger?: number
}

function InvitationStatusBadge({ status }: { status: Invitation['status'] }) {
  const variants: Record<
    Invitation['status'],
    { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }
  > = {
    pending: { variant: 'secondary', label: 'Pending' },
    accepted: { variant: 'default', label: 'Accepted' },
    expired: { variant: 'destructive', label: 'Expired' },
    cancelled: { variant: 'outline', label: 'Cancelled' },
  }

  const { variant, label } = variants[status]

  return <Badge variant={variant}>{label}</Badge>
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  )
}

export function PendingInvitations({ refreshTrigger }: PendingInvitationsProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [invitationToCancel, setInvitationToCancel] = useState<Invitation | null>(
    null
  )

  const fetchInvitations = useCallback(async () => {
    try {
      setError(null)
      const data = await getInvitations()
      setInvitations(data)
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Failed to load invitations')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations, refreshTrigger])

  async function handleResend(invitation: Invitation) {
    setActionInProgress(invitation.id)
    try {
      await resendInvitation(invitation.email)
      toast.success('Invitation resent', {
        description: `A new invitation has been sent to ${invitation.email}`,
      })
      fetchInvitations()
    } catch (err) {
      const error = err as Error
      toast.error('Failed to resend invitation', {
        description: error.message || 'Please try again',
      })
    } finally {
      setActionInProgress(null)
    }
  }

  function handleCancelClick(invitation: Invitation) {
    setInvitationToCancel(invitation)
    setCancelDialogOpen(true)
  }

  async function handleConfirmCancel() {
    if (!invitationToCancel) return

    setActionInProgress(invitationToCancel.id)
    setCancelDialogOpen(false)

    try {
      await cancelInvitation(invitationToCancel.id)
      toast.success('Invitation cancelled', {
        description: `The invitation to ${invitationToCancel.email} has been cancelled`,
      })
      fetchInvitations()
    } catch (err) {
      const error = err as Error
      toast.error('Failed to cancel invitation', {
        description: error.message || 'Please try again',
      })
    } finally {
      setActionInProgress(null)
      setInvitationToCancel(null)
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <div className="p-4">
          <TableSkeleton />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <UserX className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-medium">Failed to load invitations</h3>
        <p className="text-muted-foreground mt-1">{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => {
            setIsLoading(true)
            fetchInvitations()
          }}
        >
          <RefreshCw className="mr-2 size-4" />
          Try again
        </Button>
      </div>
    )
  }

  if (invitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Mail className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">No pending invitations</h3>
        <p className="text-muted-foreground mt-1">
          Invite team members to collaborate with you
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invited by</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation) => {
              const isExpired =
                invitation.status === 'expired' || isPast(new Date(invitation.expiresAt))
              const canResend = invitation.status === 'pending' && !isExpired
              const canCancel = invitation.status === 'pending'
              const isProcessing = actionInProgress === invitation.id

              return (
                <TableRow key={invitation.id}>
                  <TableCell className="font-medium">{invitation.email}</TableCell>
                  <TableCell>
                    <InvitationStatusBadge
                      status={isExpired && invitation.status === 'pending' ? 'expired' : invitation.status}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {invitation.inviterName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <span title={format(new Date(invitation.createdAt), 'PPpp')}>
                      {formatDistanceToNow(new Date(invitation.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        isExpired ? 'text-destructive' : 'text-muted-foreground'
                      }
                      title={format(new Date(invitation.expiresAt), 'PPpp')}
                    >
                      {isExpired ? (
                        'Expired'
                      ) : (
                        <>
                          <Clock className="mr-1 inline-block size-3" />
                          {formatDistanceToNow(new Date(invitation.expiresAt), {
                            addSuffix: true,
                          })}
                        </>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    {(canResend || canCancel) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="size-4" />
                            )}
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canResend && (
                            <DropdownMenuItem
                              onClick={() => handleResend(invitation)}
                            >
                              <RefreshCw className="mr-2 size-4" />
                              Resend invitation
                            </DropdownMenuItem>
                          )}
                          {canCancel && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleCancelClick(invitation)}
                            >
                              <Trash2 className="mr-2 size-4" />
                              Cancel invitation
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the invitation sent to{' '}
              <strong>{invitationToCancel?.email}</strong>. They will no longer
              be able to use the invitation link to join your team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep invitation</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmCancel}
            >
              Cancel invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
