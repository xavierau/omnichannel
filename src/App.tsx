import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AppLayout } from "@/components/layout"
import { OperatorProvider } from "@/contexts/OperatorContext"
import { BroadcastsPage } from "@/pages/broadcasts"
import { CustomersPage } from "@/pages/customers"
import { WhatsAppTemplatesPage } from "@/pages/whatsapp-templates"
import { InboxPage } from "@/pages/inbox"
import {
  SettingsLayout,
  ChannelsPage,
  CustomFieldsPage,
  UsersPage,
  ApiKeysPage,
  NotificationsPage,
  GeneralPage,
} from "@/pages/settings"

function App() {
  return (
    <OperatorProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/inbox" replace />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/broadcasts" element={<BroadcastsPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/templates" element={<WhatsAppTemplatesPage />} />

            {/* Settings with nested routes */}
            <Route path="/settings" element={<SettingsLayout />}>
              <Route index element={<Navigate to="/settings/channels" replace />} />
              <Route path="channels" element={<ChannelsPage />} />
              <Route path="custom-fields" element={<CustomFieldsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="api-keys" element={<ApiKeysPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="general" element={<GeneralPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </OperatorProvider>
  )
}

export default App
