import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { portalTickets, portalCreateTicket, portalMe, type PortalCustomer } from "@/services/portal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ArrowLeft, Plus, MessageSquare, Send, Loader2 } from "lucide-react"

export function PortalTicketsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [customer, setCustomer] = useState<PortalCustomer | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)

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
    setSubmitting(true)
    try {
      await portalCreateTicket(subject, description)
      setShowForm(false)
      setSubject("")
      setDescription("")
      queryClient.invalidateQueries({ queryKey: ["portal-tickets"] })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/portal")}><ArrowLeft className="h-4 w-4" /></Button>
            <span className="font-semibold text-sm">Support Tickets</span>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" />New Ticket
          </Button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {showForm && (
          <Card>
            <CardHeader><CardTitle className="text-sm">New Ticket</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
              <textarea
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm min-h-[80px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue..."
              />
              <Button onClick={handleCreate} disabled={!subject || !description || submitting}>
                {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                Submit
              </Button>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <div className="space-y-2 animate-pulse">
                    <div className="h-4 w-48 bg-muted/60 rounded" />
                    <div className="h-3 w-full bg-muted/60 rounded" />
                    <div className="h-3 w-24 bg-muted/60 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tickets?.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No tickets yet</p>
            </CardContent>
          </Card>
        ) : (
          tickets?.map((t: any) => (
            <Card key={t.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-4">
                    <span className="font-medium text-sm">{t.subject}</span>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.description.slice(0, 120)}</p>
                  </div>
                  <div className="flex gap-1.5 items-center shrink-0">
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
