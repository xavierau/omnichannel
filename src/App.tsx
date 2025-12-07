import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AppLayout } from "@/components/layout"
import { AuthLayout } from "@/layouts/AuthLayout"
import { AuthProvider } from "@/contexts/AuthContext"
import { OperatorProvider } from "@/contexts/OperatorContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { BroadcastsPage } from "@/pages/broadcasts"
import { CustomersPage } from "@/pages/customers"
import { WhatsAppTemplatesPage } from "@/pages/whatsapp-templates"
import { InboxPage } from "@/pages/inbox"
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  AcceptInvitationPage,
} from "@/pages/auth"
import {
  SettingsLayout,
  ChannelsPage,
  CustomFieldsPage,
  UsersPage,
  ApiKeysPage,
  NotificationsPage,
  GeneralPage,
} from "@/pages/settings"
import { Toaster } from "@/components/ui/sonner"

function App() {
  return (
    <AuthProvider>
      <OperatorProvider>
        <Toaster position="top-right" duration={5000} />
        <BrowserRouter>
          <Routes>
            {/* Auth routes - no protection needed */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
            </Route>

            {/* Protected app routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
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

            {/* Catch-all redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </OperatorProvider>
    </AuthProvider>
  )
}

export default App
