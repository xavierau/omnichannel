import * as React from "react"
import {
  ExternalLink,
  AppWindow,
  Building2,
  Key,
  Webhook,
  TestTube,
  ChevronDown,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

interface SetupGuideProps {
  defaultOpen?: boolean
  className?: string
}

interface SetupStep {
  id: string
  title: string
  icon: typeof AppWindow
  content: React.ReactNode
  links?: Array<{
    label: string
    url: string
  }>
}

const SETUP_STEPS: SetupStep[] = [
  {
    id: "create-app",
    title: "1. Create Meta App",
    icon: AppWindow,
    content: (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          Create a new app in Meta for Developers to get started with WhatsApp
          Business API.
        </p>
        <ol className="list-decimal list-inside space-y-1 pl-2">
          <li>Go to Meta for Developers</li>
          <li>Click &quot;My Apps&quot; and then &quot;Create App&quot;</li>
          <li>Select &quot;Business&quot; as the app type</li>
          <li>Fill in your app name and contact email</li>
          <li>Complete the app creation process</li>
        </ol>
      </div>
    ),
    links: [
      {
        label: "Meta for Developers",
        url: "https://developers.facebook.com/apps/",
      },
      {
        label: "App Creation Guide",
        url: "https://developers.facebook.com/docs/development/create-an-app/",
      },
    ],
  },
  {
    id: "setup-waba",
    title: "2. Set up WhatsApp Business Account",
    icon: Building2,
    content: (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          Add WhatsApp product to your Meta App and connect your Business
          Account.
        </p>
        <ol className="list-decimal list-inside space-y-1 pl-2">
          <li>In your app dashboard, click &quot;Add Product&quot;</li>
          <li>Find &quot;WhatsApp&quot; and click &quot;Set Up&quot;</li>
          <li>
            Connect an existing WhatsApp Business Account or create a new one
          </li>
          <li>Add and verify your phone number</li>
          <li>
            Note down your Phone Number ID and WhatsApp Business Account ID
          </li>
        </ol>
      </div>
    ),
    links: [
      {
        label: "WhatsApp Business Platform",
        url: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/",
      },
    ],
  },
  {
    id: "generate-token",
    title: "3. Generate Access Token",
    icon: Key,
    content: (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          Generate a permanent access token for API authentication.
        </p>
        <ol className="list-decimal list-inside space-y-1 pl-2">
          <li>Go to your app settings in Meta for Developers</li>
          <li>Navigate to WhatsApp &gt; API Setup</li>
          <li>
            For testing, use the temporary access token provided
          </li>
          <li>
            For production, create a System User in Business Manager
          </li>
          <li>
            Generate a permanent token with whatsapp_business_management and
            whatsapp_business_messaging permissions
          </li>
        </ol>
        <p className="mt-2 text-amber-600">
          Important: Keep your access token secure. Never expose it in
          client-side code.
        </p>
      </div>
    ),
    links: [
      {
        label: "System Users Guide",
        url: "https://developers.facebook.com/docs/marketing-api/system-users/",
      },
      {
        label: "Access Token Documentation",
        url: "https://developers.facebook.com/docs/whatsapp/business-management-api/get-started/",
      },
    ],
  },
  {
    id: "configure-webhook",
    title: "4. Configure Webhook URL",
    icon: Webhook,
    content: (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          Set up webhook to receive incoming messages and status updates.
        </p>
        <ol className="list-decimal list-inside space-y-1 pl-2">
          <li>
            Copy the Webhook URL from the settings above
          </li>
          <li>
            In Meta for Developers, go to WhatsApp &gt; Configuration
          </li>
          <li>
            Click &quot;Edit&quot; next to Callback URL
          </li>
          <li>Paste the Webhook URL</li>
          <li>
            Enter the Verify Token (from settings above)
          </li>
          <li>Click &quot;Verify and Save&quot;</li>
          <li>
            Subscribe to &quot;messages&quot; and &quot;message_templates&quot; webhook fields
          </li>
        </ol>
      </div>
    ),
    links: [
      {
        label: "Webhooks Documentation",
        url: "https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/",
      },
    ],
  },
  {
    id: "test-connection",
    title: "5. Test Connection",
    icon: TestTube,
    content: (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          Verify your setup by testing the connection.
        </p>
        <ol className="list-decimal list-inside space-y-1 pl-2">
          <li>
            Fill in all the required credentials in the form above
          </li>
          <li>Click &quot;Test Connection&quot; to verify API access</li>
          <li>
            If successful, you&apos;ll see your account information displayed
          </li>
          <li>
            Send a test message from Meta&apos;s API testing tool
          </li>
          <li>
            Verify the message appears in your inbox
          </li>
        </ol>
        <p className="mt-2">
          If you encounter errors, double-check your credentials and ensure
          your webhook is properly configured.
        </p>
      </div>
    ),
    links: [
      {
        label: "API Testing Tool",
        url: "https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages/",
      },
      {
        label: "Troubleshooting Guide",
        url: "https://developers.facebook.com/docs/whatsapp/cloud-api/support/",
      },
    ],
  },
]

/**
 * Collapsible setup guide with accordion steps for WhatsApp configuration.
 *
 * Provides step-by-step instructions for:
 * - Creating Meta App
 * - Setting up WhatsApp Business Account
 * - Generating access tokens
 * - Configuring webhooks
 * - Testing the connection
 */
export function SetupGuide({ defaultOpen = false, className }: SetupGuideProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50"
        >
          <span className="font-medium">Setup Guide</span>
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4">
          <p className="mb-4 text-sm text-muted-foreground">
            Follow these steps to set up your WhatsApp Business API integration.
          </p>
          <Accordion type="single" collapsible className="w-full">
            {SETUP_STEPS.map((step) => (
              <AccordionItem key={step.id} value={step.id}>
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <step.icon className="size-4 text-muted-foreground" />
                    <span>{step.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-6">
                    {step.content}
                    {step.links && step.links.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {step.links.map((link) => (
                          <Button
                            key={link.url}
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="gap-1"
                            >
                              {link.label}
                              <ExternalLink className="size-3" />
                            </a>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
