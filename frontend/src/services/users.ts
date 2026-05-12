import api from "./api"

export interface AppUser {
  id: string
  email: string
  role: string
  phone: string | null
  is_active: boolean
  is_superuser: boolean
  is_verified: boolean
  created_at?: string
}

export async function listUsers() {
  const res = await api.get("/users")
  return res.data as AppUser[]
}
