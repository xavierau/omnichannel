import { useLocation, useNavigate } from "react-router-dom"
import {
  Radio,
  Users,
  Key,
  Settings,
  Bell,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const settingsNavItems = [
  {
    title: "Channels",
    url: "/settings/channels",
    icon: Radio,
    description: "Manage messaging channels",
  },
  {
    title: "Users",
    url: "/settings/users",
    icon: Users,
    description: "Manage team members",
  },
  {
    title: "API Keys",
    url: "/settings/api-keys",
    icon: Key,
    description: "Manage API access",
  },
  {
    title: "Notifications",
    url: "/settings/notifications",
    icon: Bell,
    description: "Notification preferences",
  },
  {
    title: "General",
    url: "/settings/general",
    icon: Settings,
    description: "General settings",
  },
]

export function SettingsSidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="h-14 border-b flex items-center justify-center">
        <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">
          Settings
        </span>
        <Settings className="h-5 w-5 hidden group-data-[collapsible=icon]:block" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.url}
                    onClick={() => navigate(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
