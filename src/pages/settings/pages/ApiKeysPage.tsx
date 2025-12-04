import { Key } from "lucide-react"

export function ApiKeysPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
        <p className="text-muted-foreground">
          Manage API keys for external integrations
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Key className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">Coming Soon</h3>
        <p className="text-muted-foreground mt-1">
          API key management will be available in a future update
        </p>
      </div>
    </div>
  )
}
