import api from "./api"

export interface Ticket {
  id: string
  customer_id: string
  subject: string
  description: string
  priority: string
  status: string
  assigned_to: string | null
  created_at: string
  updated_at: string
}

export interface TicketCreate {
  customer_id: string
  subject: string
  description: string
  priority?: string
}

export interface TicketComment {
  id: string
  ticket_id: string
  user_id: string | null
  comment: string
  is_internal: boolean
  created_at: string
}

export async function listTickets(params?: {
  status?: string
  priority?: string
  customer_id?: string
  skip?: number
  limit?: number
}) {
  const res = await api.get("/tickets", { params })
  return res.data as Ticket[]
}

export async function getTicket(id: string) {
  const res = await api.get(`/tickets/${id}`)
  return res.data as Ticket
}

export async function createTicket(data: TicketCreate) {
  const res = await api.post("/tickets", data)
  return res.data as Ticket
}

export async function updateTicket(id: string, data: { status?: string; priority?: string; assigned_to?: string }) {
  const res = await api.put(`/tickets/${id}`, data)
  return res.data as Ticket
}

export async function getComments(ticketId: string) {
  const res = await api.get(`/tickets/${ticketId}/comments`)
  return res.data as TicketComment[]
}

export async function addComment(ticketId: string, data: { comment: string; is_internal?: boolean }) {
  const res = await api.post(`/tickets/${ticketId}/comments`, data)
  return res.data as TicketComment
}
