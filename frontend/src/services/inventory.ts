import api from "./api"

export interface CpeDevice {
  id: string
  organization_id: string
  customer_id: string | null
  subscription_id: string | null
  serial_number: string
  model: string
  manufacturer: string
  device_type: string
  status: string
  purchase_date: string | null
  warranty_expiry: string | null
  assigned_at: string | null
  returned_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CpeDeviceCreate {
  serial_number: string
  model: string
  manufacturer: string
  device_type: string
  status?: string
  purchase_date?: string
  warranty_expiry?: string
  notes?: string
}

export interface CpeDeviceUpdate {
  serial_number?: string
  model?: string
  manufacturer?: string
  device_type?: string
  status?: string
  notes?: string
}

export interface CpeDeviceAssign {
  customer_id: string
  subscription_id: string
}

export interface InventoryItem {
  id: string
  organization_id: string
  name: string
  category: string
  quantity_in_stock: number
  unit_cost: number
  supplier: string | null
  min_stock_level: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InventoryItemCreate {
  name: string
  category: string
  quantity_in_stock: number
  unit_cost: number
  supplier?: string
  min_stock_level?: number
  notes?: string
}

export interface InventoryItemUpdate {
  name?: string
  category?: string
  quantity_in_stock?: number
  unit_cost?: number
  supplier?: string
  min_stock_level?: number
  notes?: string
}

export async function listCpeDevices(params?: {
  status?: string
  customer_id?: string
  skip?: number
  limit?: number
}) {
  const res = await api.get("/inventory", { params })
  return res.data as CpeDevice[]
}

export async function createCpeDevice(data: CpeDeviceCreate) {
  const res = await api.post("/inventory", data)
  return res.data as CpeDevice
}

export async function getCpeDevice(id: string) {
  const res = await api.get(`/inventory/${id}`)
  return res.data as CpeDevice
}

export async function updateCpeDevice(id: string, data: CpeDeviceUpdate) {
  const res = await api.patch(`/inventory/${id}`, data)
  return res.data as CpeDevice
}

export async function deleteCpeDevice(id: string) {
  await api.delete(`/inventory/${id}`)
}

export async function assignCpeDevice(id: string, data: CpeDeviceAssign) {
  const res = await api.post(`/inventory/${id}/assign`, data)
  return res.data as CpeDevice
}

export async function returnCpeDevice(id: string) {
  const res = await api.post(`/inventory/${id}/return`)
  return res.data as CpeDevice
}

export async function listInventoryStock(params?: {
  skip?: number
  limit?: number
}) {
  const res = await api.get("/inventory/stock", { params })
  return res.data as InventoryItem[]
}

export async function createInventoryStock(data: InventoryItemCreate) {
  const res = await api.post("/inventory/stock", data)
  return res.data as InventoryItem
}

export async function updateInventoryStock(id: string, data: InventoryItemUpdate) {
  const res = await api.patch(`/inventory/stock/${id}`, data)
  return res.data as InventoryItem
}
