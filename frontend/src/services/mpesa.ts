import api from "./api"

export interface MpesaTransaction {
  id: string
  type: string
  phone: string
  amount: number
  receipt: string | null
  status: string
  checkout_request_id: string | null
  created_at: string
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
  skip?: number
  limit?: number
}) {
  const res = await api.get("/mpesa/transactions", { params })
  return res.data as MpesaTransaction[]
}
