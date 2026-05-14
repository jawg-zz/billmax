import axios from "axios"

const portalApi = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
})

portalApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("portal_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

portalApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("portal_token")
      window.location.href = "/portal/login"
    }
    return Promise.reject(error)
  },
)

export default portalApi
