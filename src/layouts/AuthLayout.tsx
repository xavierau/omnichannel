import { Outlet, Navigate } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

/**
 * AuthLayout provides a centered card layout for authentication pages.
 * It redirects authenticated users to the main app.
 */
export function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth()

  // Show nothing while checking auth status
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Redirect authenticated users to the app
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      {/* Header with logo */}
      <header className="flex h-16 items-center justify-center border-b bg-background px-6">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <MessageSquare className="size-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold">Omnichannel</span>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="flex h-16 items-center justify-center border-t bg-background px-6">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Omnichannel Platform. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
