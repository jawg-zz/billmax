import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { ThemeProvider } from "@/components/ui/ThemeProvider"
import { ToastProvider } from "@/components/ui/Toaster"
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
import { UsagePage } from "@/pages/UsagePage"
import { PortalLoginPage } from "@/pages/portal/PortalLoginPage"
import { PortalRegisterPage } from "@/pages/portal/PortalRegisterPage"
import { PortalDashboardPage } from "@/pages/portal/PortalDashboardPage"
import { PortalInvoicesPage } from "@/pages/portal/PortalInvoicesPage"
import { PortalTicketsPage } from "@/pages/portal/PortalTicketsPage"
import type { ReactNode } from "react"

const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      // Let individual pages handle their own toast notifications
      retry: 0,
    },
  },
})

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <svg className="h-4 w-4 text-primary-foreground animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
          </svg>
        </div>
        <span className="text-sm text-muted-foreground animate-pulse">Loading...</span>
      </div>
    </div>
  )
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
        <Route path="/usage" element={<UsagePage />} />
      </Route>
      <Route path="/portal/login" element={<PortalLoginPage />} />
      <Route path="/portal/register" element={<PortalRegisterPage />} />
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
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
