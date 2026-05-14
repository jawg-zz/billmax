import api from "./api"

export async function revenueReport(params?: { from_date?: string; to_date?: string }) {
  const res = await api.get("/reports/revenue", { params })
  return res.data
}

export async function collectionsReport(params?: { from_date?: string; to_date?: string }) {
  const res = await api.get("/reports/collections", { params })
  return res.data
}

export async function customerReport(params?: { from_date?: string; to_date?: string }) {
  const res = await api.get("/reports/customers", { params })
  return res.data
}

export async function planReport() {
  const res = await api.get("/reports/plans")
  return res.data
}

export async function taxReport(params?: { from_date?: string; to_date?: string }) {
  const res = await api.get("/reports/tax", { params })
  return res.data
}
