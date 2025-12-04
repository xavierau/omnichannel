import { useLocation, useNavigate } from "react-router-dom"
import {
  Inbox,
  Megaphone,
  Users,
  FileText,
  Settings,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const mainNavItems = [
  {
    title: "Inbox",
    url: "/inbox",
    icon: Inbox,
  },
  {
    title: "Broadcasts",
    url: "/broadcasts",
    icon: Megaphone,
  },
  {
    title: "Customers",
    url: "/customers",
    icon: Users,
  },
  {
    title: "Templates",
    url: "/templates",
    icon: FileText,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (url: string) => {
    if (url === "/settings") {
      return location.pathname.startsWith("/settings")
    }
    return location.pathname === url
  }

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="h-14 border-b flex items-center justify-center">
        <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">
          Omnichannel
        </span>
        <Megaphone className="h-5 w-5 hidden group-data-[collapsible=icon]:block" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive(item.url)}
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
