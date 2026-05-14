import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { portalTickets, portalCreateTicket, portalMe, type PortalCustomer } from "@/services/portal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ArrowLeft, Plus, MessageSquare, Send } from "lucide-react"

export function PortalTicketsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [customer, setCustomer] = useState<PortalCustomer | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("portal_token")
    if (!token) { navigate("/portal/login"); return }
    portalMe().then(setCustomer).catch(() => navigate("/portal/login"))
  }, [])

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["portal-tickets"],
    queryFn: () => portalTickets(),
    enabled: !!customer,
  })

  const handleCreate = async () => {
    await portalCreateTicket(subject, description)
    setShowForm(false)
    setSubject("")
    setDescription("")
    queryClient.invalidateQueries({ queryKey: ["portal-tickets"] })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/portal")}><ArrowLeft className="h-4 w-4" /></Button>
            <span className="font-semibold">Support Tickets</span>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" />New Ticket
          </Button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {showForm && (
          <Card>
            <CardHeader><CardTitle className="text-sm">New Ticket</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
              <textarea
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm min-h-[80px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue..."
              />
              <Button onClick={handleCreate} disabled={!subject || !description}>
                <Send className="h-4 w-4 mr-1" />Submit
              </Button>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : tickets?.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No tickets yet
          </CardContent></Card>
        ) : (
          tickets?.map((t: any) => (
            <Card key={t.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">{t.subject}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.description.slice(0, 120)}</p>
                  </div>
                  <div className="flex gap-1 items-center">
                    <StatusBadge status={t.status} />
                    <StatusBadge status={t.priority} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{new Date(t.created_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  )
}
