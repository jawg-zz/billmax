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

export async function exportCsv(reportType: string, params?: { from_date?: string; to_date?: string }) {
  const res = await api.get(`/reports/export/${reportType}`, {
    params,
    responseType: "blob",
  })
  const url = window.URL.createObjectURL(new Blob([res.data]))
  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", `${reportType}_report.csv`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
