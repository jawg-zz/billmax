import api from "./api"

export interface Customer {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string | null
  id_number: string | null
  kra_pin: string | null
  status: string
  mpesa_phone: string | null
  physical_address: string | null
  service_address: string | null
  notes: string | null
  alternative_phone: string | null
  location_lat: number | null
  location_lng: number | null
  organization_id: string
  created_at: string
  updated_at: string
  provisioning?: { success: boolean; error?: string }
}

export interface CustomerCreate {
  first_name: string
  last_name: string
  phone: string
  email?: string
  id_number?: string
  kra_pin?: string
  mpesa_phone?: string
  physical_address?: string
  service_address?: string
  status?: string
}

export async function listCustomers(params?: { skip?: number; limit?: number; status?: string }) {
  const res = await api.get("/customers", { params })
  return res.data as Customer[]
}

export async function getCustomer(id: string) {
  const res = await api.get(`/customers/${id}`)
  return res.data as Customer
}

export async function createCustomer(data: CustomerCreate) {
  const res = await api.post("/customers", data)
  return res.data as Customer
}

export async function updateCustomer(id: string, data: Partial<CustomerCreate>) {
  const res = await api.put(`/customers/${id}`, data)
  return res.data as Customer
}

export async function deleteCustomer(id: string) {
  await api.delete(`/customers/${id}`)
}

export async function approveCustomer(id: string) {
  const res = await api.post(`/customers/${id}/approve`)
  return res.data as Customer
}

export async function rejectCustomer(id: string) {
  const res = await api.post(`/customers/${id}/reject`)
  return res.data as Customer
}
