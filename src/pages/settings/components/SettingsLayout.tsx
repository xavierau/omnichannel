import { Outlet } from "react-router-dom"
import { FloatingVerticalTabs } from "./FloatingVerticalTabs"

export function SettingsLayout() {
  return (
    <div className="relative min-h-[calc(100vh-3.5rem)]">
      <FloatingVerticalTabs />
      <div className="pl-20">
        <Outlet />
      </div>
    </div>
  )
}
