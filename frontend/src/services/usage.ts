import api from "./api"
import portalApi from "./portal_api"

export interface UsageSummary {
  subscription_id: string
  customer_name: string
  plan_name: string
  data_cap_gb: number | null
  download_gb: number
  upload_gb: number
  total_gb: number
  usage_percent: number
  period_start: string
  period_end: string
}

export interface SubscriptionUsage {
  subscription_id: string
  download_gb: number
  upload_gb: number
  total_gb: number
  data_cap_gb: number | null
  usage_percent: number
}

export async function getUsageSummary(params?: {
  subscription_id?: string
  customer_id?: string
  days?: number
}) {
  const res = await api.get("/usage/summary", { params })
  return res.data as UsageSummary[]
}

export async function getSubscriptionUsage(subscriptionId: string, days = 30) {
  const res = await api.get(`/usage/subscription/${subscriptionId}`, { params: { days } })
  return res.data as SubscriptionUsage
}

export async function recordUsage(data: {
  subscription_id: string
  download_bytes: number
  upload_bytes: number
  period_start: string
  period_end: string
  source?: string
}) {
  const res = await api.post("/usage/records", data)
  return res.data
}

export async function enforceFup() {
  const res = await api.post("/usage/enforce-fup")
  return res.data as { alerts_created: number; alerts: any[] }
}

export async function portalUsage() {
  const res = await portalApi.get("/portal/usage")
  return res.data as { usage: SubscriptionUsage | null }
}
