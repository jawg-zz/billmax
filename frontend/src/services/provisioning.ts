import api from "./api"

export async function provision(id: string) {
  const res = await api.post(`/provisioning/provision/${id}`)
  return res.data
}

export async function suspend(id: string) {
  const res = await api.post(`/provisioning/suspend/${id}`)
  return res.data
}

export async function restore(id: string) {
  const res = await api.post(`/provisioning/restore/${id}`)
  return res.data
}

export async function changeSpeed(id: string, planId: string) {
  const res = await api.post(`/provisioning/speed/${id}`, null, { params: { plan_id: planId } })
  return res.data
}

export async function deprovision(id: string) {
  const res = await api.post(`/provisioning/deprovision/${id}`)
  return res.data
}
