import api from "./api"

export interface Plan {
  id: string
  name: string
  description: string | null
  type: string
  download_speed_mbps: number
  upload_speed_mbps: number
  data_cap_gb: number | null
  price: number
  setup_fee: number
  billing_cycle: string
  is_taxable: boolean
  is_active: boolean
}

export interface PlanCreate {
  name: string
  type: string
  download_speed_mbps: number
  upload_speed_mbps: number
  price: number
  setup_fee?: number
  billing_cycle?: string
  data_cap_gb?: number
  description?: string
}

export async function listPlans(params?: { skip?: number; limit?: number }) {
  const res = await api.get("/plans", { params })
  return res.data as Plan[]
}

export async function getPlan(id: string) {
  const res = await api.get(`/plans/${id}`)
  return res.data as Plan
}

export async function createPlan(data: PlanCreate) {
  const res = await api.post("/plans", data)
  return res.data as Plan
}

export async function updatePlan(id: string, data: Partial<PlanCreate>) {
  const res = await api.put(`/plans/${id}`, data)
  return res.data as Plan
}

export async function deletePlan(id: string) {
  await api.delete(`/plans/${id}`)
}
