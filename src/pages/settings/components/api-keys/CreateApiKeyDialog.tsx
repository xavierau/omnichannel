import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { CreateApiKeyDto } from "@/types/api-key"
import type { ChannelAccount } from "@/services/channel-account.service"

// Zod schema for form validation
const createApiKeySchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(100, "Name must be 100 characters or less"),
    channelAccountId: z.string().optional(),
    permissions: z
      .array(
        z.enum([
          "conversation:read",
          "conversation:update_status",
          "conversation:assign",
          "message:send",
        ])
      )
      .min(1, "At least one permission is required"),
    hasExpiration: z.boolean(),
    expiresAt: z.date().optional(),
  })
  .refine((data) => !data.hasExpiration || data.expiresAt !== undefined, {
    message: "Expiration date is required when expiration is enabled",
    path: ["expiresAt"],
  })
  .refine((data) => !data.expiresAt || data.expiresAt > new Date(), {
    message: "Expiration date must be in the future",
    path: ["expiresAt"],
  })

type FormValues = z.infer<typeof createApiKeySchema>

type Permission = FormValues["permissions"][number]

const permissionOptions: {
  value: Permission
  label: string
  description: string
}[] = [
  {
    value: "conversation:read",
    label: "Read Conversations",
    description: "View conversation details and messages",
  },
  {
    value: "conversation:update_status",
    label: "Update Status",
    description: "Change conversation status (open, pending, resolved)",
  },
  {
    value: "conversation:assign",
    label: "Assign Conversations",
    description: "Assign conversations to agents or teams",
  },
  {
    value: "message:send",
    label: "Send Messages",
    description: "Send messages in conversations",
  },
]

interface CreateApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateApiKeyDto) => Promise<void>
  channelAccounts: ChannelAccount[]
}

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  onSubmit,
  channelAccounts,
}: CreateApiKeyDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: {
      name: "",
      channelAccountId: "",
      permissions: [],
      hasExpiration: false,
      expiresAt: undefined,
    },
  })

  const hasExpiration = form.watch("hasExpiration")

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        channelAccountId: "",
        permissions: [],
        hasExpiration: false,
        expiresAt: undefined,
      })
    }
  }, [open, form])

  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true)
    try {
      const data: CreateApiKeyDto = {
        name: values.name.trim(),
        permissions: values.permissions,
        ...(values.channelAccountId && { channelAccountId: values.channelAccountId }),
        ...(values.hasExpiration &&
          values.expiresAt && {
            expiresAt: values.expiresAt.toISOString(),
          }),
      }
      await onSubmit(data)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset()
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>
            Generate a new API key for external integrations. The key will only
            be shown once.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My API Key"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    A descriptive name to identify this API key
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Channel Account Field (Optional) */}
            <FormField
              control={form.control}
              name="channelAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel Account (Optional)</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === "__all__" ? undefined : value)
                    }
                    value={field.value || "__all__"}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All channels (no restriction)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__all__">
                        All channels (no restriction)
                      </SelectItem>
                      {channelAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Optionally restrict this key to a specific channel account
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Permissions Field */}
            <FormField
              control={form.control}
              name="permissions"
              render={() => (
                <FormItem>
                  <FormLabel>
                    Permissions <span className="text-destructive">*</span>
                  </FormLabel>
                  <div className="space-y-3 rounded-md border p-4">
                    {permissionOptions.map((permission) => (
                      <FormField
                        key={permission.value}
                        control={form.control}
                        name="permissions"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(permission.value)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || []
                                  if (checked) {
                                    field.onChange([...current, permission.value])
                                  } else {
                                    field.onChange(
                                      current.filter((v) => v !== permission.value)
                                    )
                                  }
                                }}
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="cursor-pointer font-normal">
                                {permission.label}
                              </FormLabel>
                              <FormDescription className="text-xs">
                                {permission.description}
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Expiration Toggle + Date Picker */}
            <FormField
              control={form.control}
              name="hasExpiration"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Set Expiration Date</FormLabel>
                    <FormDescription>
                      Enable to set when this key should expire
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked)
                        if (!checked) {
                          form.setValue("expiresAt", undefined)
                        }
                      }}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {hasExpiration && (
              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>
                      Expiration Date <span className="text-destructive">*</span>
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isSubmitting}
                          >
                            <CalendarIcon className="mr-2 size-4" />
                            {field.value
                              ? format(field.value, "PPP")
                              : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date <= new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Create Key
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
