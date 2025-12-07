import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  X,
  UserPlus,
} from 'lucide-react'

import {
  validateInvitation,
  acceptInvitation,
} from '@/services/invitations'
import type { InvitationInfo } from '@/services/invitations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const acceptInvitationSchema = z
  .object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(50, 'First name must be less than 50 characters'),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(50, 'Last name must be less than 50 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>

interface PasswordRequirement {
  label: string
  test: (password: string) => boolean
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
]

export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [isValidating, setIsValidating] = useState(true)
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInvitationFormData>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
    },
  })

  const password = watch('password', '')

  // Calculate password strength
  const passwordStrength = useMemo(() => {
    const metRequirements = passwordRequirements.filter((req) =>
      req.test(password)
    ).length
    return metRequirements
  }, [password])

  const strengthLabel = useMemo(() => {
    if (password.length === 0) return ''
    if (passwordStrength <= 1) return 'Weak'
    if (passwordStrength <= 2) return 'Fair'
    if (passwordStrength <= 3) return 'Good'
    return 'Strong'
  }, [password.length, passwordStrength])

  const strengthColor = useMemo(() => {
    if (passwordStrength <= 1) return 'bg-destructive'
    if (passwordStrength <= 2) return 'bg-warning'
    if (passwordStrength <= 3) return 'bg-info'
    return 'bg-success'
  }, [passwordStrength])

  // Validate invitation token on mount
  // Uses AbortController for proper cleanup on unmount
  useEffect(() => {
    if (!token) {
      setIsValidating(false)
      setValidationError('No invitation token provided')
      return
    }

    const abortController = new AbortController()

    async function validate() {
      try {
        const info = await validateInvitation(token!, abortController.signal)
        // Only update state if request wasn't aborted
        if (!abortController.signal.aborted) {
          setInvitationInfo(info)
          setIsValidating(false)
        }
      } catch (err) {
        // Silently ignore AbortError - this is expected on unmount
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        // Only update state if request wasn't aborted
        if (!abortController.signal.aborted) {
          const error = err as Error
          setValidationError(
            error.message || 'This invitation is invalid or has expired'
          )
          setIsValidating(false)
        }
      }
    }

    validate()

    return () => {
      abortController.abort()
    }
  }, [token])

  /**
   * Re-validates the invitation after an error.
   * If the invitation is no longer valid (e.g., accepted in another tab),
   * shows the invalid invitation screen instead of the form.
   */
  async function revalidateInvitationAfterError(): Promise<void> {
    if (!token) return

    try {
      await validateInvitation(token)
      // Invitation is still valid, keep showing the form with the error
    } catch {
      // Invitation is no longer valid - show the invalid state
      setValidationError('This invitation is no longer valid. It may have already been used.')
      setInvitationInfo(null)
    }
  }

  async function onSubmit(data: AcceptInvitationFormData) {
    if (!token) {
      setServerError('Invalid invitation token')
      return
    }

    setServerError(null)

    try {
      await acceptInvitation(token, {
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
      })
      setIsSuccess(true)
    } catch (err) {
      const error = err as Error
      setServerError(
        error.message || 'Failed to accept invitation. Please try again.'
      )

      // Re-validate invitation to check if it's still usable
      // This handles cases where the invitation was accepted in another tab
      await revalidateInvitationAfterError()
    }
  }

  // Loading state
  if (isValidating) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
          <Skeleton className="mx-auto h-6 w-48" />
          <Skeleton className="mx-auto h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Invalid/expired invitation
  if (validationError) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="size-6 text-destructive" />
          </div>
          <CardTitle className="text-center text-2xl">
            Invalid invitation
          </CardTitle>
          <CardDescription className="text-center">
            {validationError}
          </CardDescription>
        </CardHeader>

        <CardFooter className="flex flex-col space-y-2">
          <Button asChild className="w-full">
            <Link to="/login">Go to login</Link>
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Contact your administrator if you need a new invitation
          </p>
        </CardFooter>
      </Card>
    )
  }

  // Success state
  if (isSuccess) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="size-6 text-success" />
          </div>
          <CardTitle className="text-center text-2xl">
            Welcome aboard!
          </CardTitle>
          <CardDescription className="text-center">
            Your account has been created successfully. You can now sign in to
            access {invitationInfo?.tenantName}.
          </CardDescription>
        </CardHeader>

        <CardFooter>
          <Button
            className="w-full"
            onClick={() => navigate('/login', { replace: true })}
          >
            Sign in
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Invitation form
  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
          <UserPlus className="size-6 text-primary" />
        </div>
        <CardTitle className="text-center text-2xl">
          Join {invitationInfo?.tenantName}
        </CardTitle>
        <CardDescription className="text-center">
          {invitationInfo?.inviterName} has invited you to join their team.
          <br />
          Create your account to get started.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                placeholder="John"
                autoComplete="given-name"
                aria-invalid={!!errors.firstName}
                aria-describedby={
                  errors.firstName ? 'firstName-error' : undefined
                }
                {...register('firstName')}
              />
              {errors.firstName && (
                <p id="firstName-error" className="text-sm text-destructive">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                autoComplete="family-name"
                aria-invalid={!!errors.lastName}
                aria-describedby={
                  errors.lastName ? 'lastName-error' : undefined
                }
                {...register('lastName')}
              />
              {errors.lastName && (
                <p id="lastName-error" className="text-sm text-destructive">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                aria-describedby="password-requirements"
                {...register('password')}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="size-4 text-muted-foreground" />
                ) : (
                  <Eye className="size-4 text-muted-foreground" />
                )}
              </Button>
            </div>

            {/* Password strength indicator */}
            {password.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors',
                          passwordStrength >= level ? strengthColor : 'bg-muted'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {strengthLabel}
                  </span>
                </div>

                <ul
                  id="password-requirements"
                  className="grid grid-cols-2 gap-1 text-xs"
                >
                  {passwordRequirements.map((req) => {
                    const isMet = req.test(password)
                    return (
                      <li
                        key={req.label}
                        className={cn(
                          'flex items-center gap-1',
                          isMet ? 'text-success' : 'text-muted-foreground'
                        )}
                      >
                        {isMet ? (
                          <Check className="size-3" />
                        ) : (
                          <X className="size-3" />
                        )}
                        {req.label}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={
                  errors.confirmPassword ? 'confirmPassword-error' : undefined
                }
                {...register('confirmPassword')}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={
                  showConfirmPassword ? 'Hide password' : 'Show password'
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4 text-muted-foreground" />
                ) : (
                  <Eye className="size-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p id="confirmPassword-error" className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Create account
          </Button>

          <Button asChild variant="ghost" className="w-full">
            <Link to="/login">
              <ArrowLeft className="mr-2 size-4" />
              Back to login
            </Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
