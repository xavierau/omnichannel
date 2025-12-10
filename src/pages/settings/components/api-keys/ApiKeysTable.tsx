import { MoreHorizontal, Trash2 } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import type { ApiKey } from "@/types/api-key"
import { ApiKeyPermissionBadges } from "./ApiKeyPermissionBadges"
import { ApiKeyStatusBadge } from "./ApiKeyStatusBadge"

interface ApiKeysTableProps {
  apiKeys: ApiKey[]
  onRevoke: (apiKey: ApiKey) => void
  isLoading?: boolean
}

/**
 * Formats a date string to relative time (e.g., "2 hours ago").
 * Returns "Never" if the date is null.
 */
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Never"
  return formatDistanceToNow(new Date(dateString), { addSuffix: true })
}

/**
 * Formats a date string to a readable date format (e.g., "Dec 10, 2024").
 * Returns "Never" if the date is null.
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return "Never"
  return format(new Date(dateString), "MMM d, yyyy")
}

function LoadingSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Used</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-8 w-8" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function EmptyState() {
  return (
    <TableRow>
      <TableCell colSpan={8} className="h-24 text-center">
        <div className="flex flex-col items-center justify-center text-muted-foreground">
          <p>No API keys found</p>
          <p className="text-sm">Create your first API key to get started</p>
        </div>
      </TableCell>
    </TableRow>
  )
}

export function ApiKeysTable({ apiKeys, onRevoke, isLoading = false }: ApiKeysTableProps) {
  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Used</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apiKeys.length === 0 ? (
            <EmptyState />
          ) : (
            apiKeys.map((apiKey) => (
              <TableRow key={apiKey.id}>
                <TableCell className="font-medium">{apiKey.name}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {apiKey.keyPrefix}...
                </TableCell>
                <TableCell>
                  <ApiKeyPermissionBadges permissions={apiKey.permissions} />
                </TableCell>
                <TableCell>
                  <ApiKeyStatusBadge
                    isActive={apiKey.isActive}
                    expiresAt={apiKey.expiresAt}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatRelativeTime(apiKey.lastUsedAt)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(apiKey.createdAt)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(apiKey.expiresAt)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={!apiKey.isActive}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onRevoke(apiKey)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Revoke
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
