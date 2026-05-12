import api from "./api"

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface User {
  id: string
  email: string
  role: string
  is_active: boolean
  is_superuser: boolean
  is_verified: boolean
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const formData = new URLSearchParams()
  formData.append("username", data.username)
  formData.append("password", data.password)
  const res = await api.post("/auth/login", formData.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  })
  return res.data
}

export async function getMe(): Promise<User> {
  const res = await api.get("/users/me")
  return res.data
}

export async function register(data: { email: string; password: string }) {
  const res = await api.post("/auth/register", data)
  return res.data
}
