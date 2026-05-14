import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { AppLayout } from "@/components/layout/AppLayout"
import { LoginPage } from "@/pages/LoginPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { CustomerListPage } from "@/pages/customers/CustomerListPage"
import { CustomerFormPage } from "@/pages/customers/CustomerFormPage"
import { PlanListPage } from "@/pages/plans/PlanListPage"
import { SubscriptionListPage } from "@/pages/subscriptions/SubscriptionListPage"
import { InvoiceListPage } from "@/pages/invoices/InvoiceListPage"
import { InvoiceDetailPage } from "@/pages/invoices/InvoiceDetailPage"
import { MpesaPage } from "@/pages/mpesa/MpesaPage"
import { CustomerDetailPage } from "@/pages/customers/CustomerDetailPage"
import { TicketListPage } from "@/pages/tickets/TicketListPage"
import { TicketDetailPage } from "@/pages/tickets/TicketDetailPage"
import { SubscriptionDetailPage } from "@/pages/subscriptions/SubscriptionDetailPage"
import { UsersPage } from "@/pages/users/UsersPage"
import { ReportsPage } from "@/pages/reports/ReportsPage"
import { PortalLoginPage } from "@/pages/portal/PortalLoginPage"
import { PortalDashboardPage } from "@/pages/portal/PortalDashboardPage"
import { PortalInvoicesPage } from "@/pages/portal/PortalInvoicesPage"
import { PortalTicketsPage } from "@/pages/portal/PortalTicketsPage"
import type { ReactNode } from "react"

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomerListPage />} />
        <Route path="/customers/new" element={<CustomerFormPage />} />
        <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
        <Route path="/plans" element={<PlanListPage />} />
        <Route path="/subscriptions" element={<SubscriptionListPage />} />
        <Route path="/invoices" element={<InvoiceListPage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="/mpesa" element={<MpesaPage />} />
        <Route path="/customers/:id" element={<CustomerDetailPage />} />
        <Route path="/tickets" element={<TicketListPage />} />
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
        <Route path="/subscriptions/:id" element={<SubscriptionDetailPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>
      <Route path="/portal/login" element={<PortalLoginPage />} />
      <Route path="/portal" element={<PortalDashboardPage />} />
      <Route path="/portal/invoices" element={<PortalInvoicesPage />} />
      <Route path="/portal/tickets" element={<PortalTicketsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
