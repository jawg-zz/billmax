import api from "./api"

export interface Subscription {
  id: string
  customer_id: string
  plan_id: string
  status: string
  next_billing_date: string
  auto_renew: boolean
  provisioned: boolean
  provisioned_username: string | null
  notes: string | null
  created_at: string
}

export interface SubscriptionCreate {
  customer_id: string
  plan_id: string
  next_billing_date: string
  auto_renew?: boolean
  notes?: string
}

export async function listSubscriptions(params?: { skip?: number; limit?: number }) {
  const res = await api.get("/subscriptions", { params })
  return res.data as Subscription[]
}

export async function getSubscription(id: string) {
  const res = await api.get(`/subscriptions/${id}`)
  return res.data as Subscription
}

export async function createSubscription(data: SubscriptionCreate) {
  const res = await api.post("/subscriptions", data)
  return res.data as Subscription
}

export async function updateSubscription(id: string, data: Partial<SubscriptionCreate>) {
  const res = await api.put(`/subscriptions/${id}`, data)
  return res.data as Subscription
}

export async function deleteSubscription(id: string) {
  await api.delete(`/subscriptions/${id}`)
}
