import { Bell } from "lucide-react"

export function NotificationsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
          Configure your notification preferences
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Bell className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">Coming Soon</h3>
        <p className="text-muted-foreground mt-1">
          Notification settings will be available in a future update
        </p>
      </div>
    </div>
  )
}
