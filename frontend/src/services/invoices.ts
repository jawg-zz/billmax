import api from "./api"

export interface Invoice {
  id: string
  invoice_number: string
  customer_id: string
  subscription_id: string | null
  issue_date: string
  due_date: string
  subtotal: number
  vat_amount: number
  total: number
  balance_due: number
  status: string
  notes: string | null
  created_at: string
  items: InvoiceItem[]
}

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
  is_taxable: boolean
  tax_rate: number
  tax_amount: number
}

export async function listInvoices(params?: {
  skip?: number
  limit?: number
  status?: string
  customer_id?: string
}) {
  const res = await api.get("/invoices", { params })
  return res.data as Invoice[]
}

export async function getInvoice(id: string) {
  const res = await api.get(`/invoices/${id}`)
  return res.data as Invoice
}

export async function sendInvoice(id: string) {
  const res = await api.post(`/invoices/${id}/send`)
  return res.data
}

export async function recordPayment(
  id: string,
  data: { amount: number; payment_method: string; transaction_code?: string }
) {
  const res = await api.post(`/invoices/${id}/payment`, null, { params: data })
  return res.data
}
