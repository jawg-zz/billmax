import api from "./api"
import portalApi from "./portal_api"

export interface PortalCustomer {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string | null
  mpesa_phone?: string | null
  status?: string
}

export interface PortalInvoice {
  id: string
  invoice_number: string
  issue_date: string
  due_date: string
  total: number
  balance_due: number
  status: string
  items?: { description: string; quantity: number; unit_price: number; total: number }[]
  subtotal?: number
  vat_amount?: number
}

export async function portalLogin(phone: string, password: string) {
  const res = await api.post("/portal/login", null, { params: { phone, password } })
  return res.data as { access_token: string; customer: PortalCustomer }
}

export async function portalMe() {
  const res = await portalApi.get("/portal/me")
  return res.data as PortalCustomer
}

export async function portalInvoices() {
  const res = await portalApi.get("/portal/invoices")
  return res.data as PortalInvoice[]
}

export async function portalInvoiceDetail(id: string) {
  const res = await portalApi.get(`/portal/invoices/${id}`)
  return res.data as PortalInvoice
}

export async function portalPayInvoice(id: string) {
  const res = await portalApi.post(`/portal/invoices/${id}/pay`)
  return res.data
}

export async function portalSubscription() {
  const res = await portalApi.get("/portal/subscription")
  return res.data as { subscription: any }
}

export async function portalTickets() {
  const res = await portalApi.get("/portal/tickets")
  return res.data as any[]
}

export async function portalCreateTicket(subject: string, description: string, priority = "medium") {
  const res = await portalApi.post("/portal/tickets", null, { params: { subject, description, priority } })
  return res.data
}

export async function portalChangePassword(current_password: string, new_password: string) {
  const res = await portalApi.post("/portal/change-password", null, { params: { current_password, new_password } })
  return res.data
}

export interface RegisterPlan {
  id: string
  name: string
  type: string
  download_speed_mbps: number
  upload_speed_mbps: number
  data_cap_gb: number | null
  price: number
  setup_fee: number
  billing_cycle: string
  description: string | null
}

export async function portalRegisterPlans() {
  const res = await api.get("/portal/register/plans")
  return res.data as RegisterPlan[]
}

export async function portalRegister(data: {
  first_name: string
  last_name: string
  phone: string
  email?: string
  password: string
  id_number?: string
  physical_address?: string
  service_address?: string
  plan_id: string
}) {
  const res = await api.post("/portal/register", null, { params: data })
  return res.data as { message: string; customer_id: string }
}
