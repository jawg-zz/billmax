import api from "./api"

export interface AppSettings {
  config: Record<string, any>
  organization: {
    name: string
    address: string
    phone: string
    email: string
    kra_pin: string
    logo_url: string | null
  }
}

export async function getSettings(): Promise<AppSettings> {
  const res = await api.get("/settings")
  return res.data
}

export async function saveSettings(config: Record<string, any>): Promise<{ message: string; config: Record<string, any> }> {
  const res = await api.put("/settings", { config })
  return res.data
}

export async function saveOrganization(data: Record<string, string>): Promise<{ message: string; organization: any }> {
  const res = await api.put("/settings/organization", data)
  return res.data
}
