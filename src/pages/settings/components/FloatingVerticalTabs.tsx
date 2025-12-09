import { useLocation, useNavigate } from "react-router-dom"
import {
  Radio,
  Users,
  UsersRound,
  Key,
  Settings,
  Bell,
  Sliders,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const settingsNavItems = [
  {
    title: "Channels",
    url: "/settings/channels",
    icon: Radio,
  },
  {
    title: "Custom Fields",
    url: "/settings/custom-fields",
    icon: Sliders,
  },
  {
    title: "Users",
    url: "/settings/users",
    icon: Users,
  },
  {
    title: "Teams",
    url: "/settings/teams",
    icon: UsersRound,
  },
  {
    title: "API Keys",
    url: "/settings/api-keys",
    icon: Key,
  },
  {
    title: "Notifications",
    url: "/settings/notifications",
    icon: Bell,
  },
  {
    title: "General",
    url: "/settings/general",
    icon: Settings,
  },
]

export function FloatingVerticalTabs() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <TooltipProvider delayDuration={0}>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-40">
        <div className="flex flex-col gap-1 rounded-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border shadow-lg p-2">
          {settingsNavItems.map((item) => {
            const isActive = location.pathname === item.url
            return (
              <Tooltip key={item.title}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(item.url)}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="sr-only">{item.title}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.title}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
