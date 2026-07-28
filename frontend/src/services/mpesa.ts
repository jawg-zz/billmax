import api from "./api"

export interface MpesaTransaction {
  id: string
  type: string
  phone: string
  amount: number
  receipt: string | null
  status: string
  checkout_request_id: string | null
  customer_id: string | null
  invoice_id: string | null
  account_reference: string | null
  created_at: string
  updated_at: string
}

export interface MpesaSummary {
  today: {
    count: number
    total: number
  }
  week: {
    count: number
    total: number
  }
  pending: number
}

export async function initiateStkPush(data: {
  customer_id: string
  amount: number
  phone: string
  invoice_id?: string
}) {
  const res = await api.post("/mpesa/stk-push", null, { params: data })
  return res.data
}

export async function queryTransaction(checkout_request_id: string) {
  const res = await api.post("/mpesa/query", null, { params: { checkout_request_id } })
  return res.data
}

export async function listMpesaTransactions(params?: {
  status?: string
  customer_id?: string
  date_from?: string
  date_to?: string
  search?: string
  skip?: number
  limit?: number
}) {
  const res = await api.get("/mpesa/transactions", { params })
  return res.data as MpesaTransaction[]
}

export async function reconcileTransactions() {
  const res = await api.post("/mpesa/reconcile")
  return res.data
}

export async function getMpesaSummary() {
  const res = await api.get("/mpesa/summary")
  return res.data as MpesaSummary
}
