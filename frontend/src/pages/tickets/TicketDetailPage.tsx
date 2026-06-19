import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getTicket, getComments, addComment, updateTicket } from "@/services/tickets"
import { getCustomer } from "@/services/customers"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Send } from "lucide-react"
import { PageTransition } from "@/components/shared/PageTransition"
import { CardSkeleton } from "@/components/ui/Skeleton"
import { EmptyState } from "@/components/ui/EmptyState"
import { useToast } from "@/components/ui/Toaster"

export function TicketDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [newComment, setNewComment] = useState("")

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => getTicket(id!),
    enabled: !!id,
  })

  const { data: comments } = useQuery({
    queryKey: ["ticket-comments", id],
    queryFn: () => getComments(id!),
    enabled: !!id,
  })

  const { data: customer } = useQuery({
    queryKey: ["customer", ticket?.customer_id],
    queryFn: () => getCustomer(ticket!.customer_id),
    enabled: !!ticket?.customer_id,
  })

  const commentMut = useMutation({
    mutationFn: () => addComment(id!, { comment: newComment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-comments"] })
      setNewComment("")
      toast("success", "Comment added", "Your comment has been posted.")
    },
    onError: () => toast("error", "Failed to add comment"),
  })

  const statusMut = useMutation({
    mutationFn: (status: string) => updateTicket(id!, { status }),
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] })
      toast("success", "Status updated", `Ticket status changed to ${status.replace("_", " ")}`)
    },
    onError: () => toast("error", "Failed to update status"),
  })

  if (isLoading) return (
    <PageTransition>
      <CardSkeleton count={3} />
    </PageTransition>
  )
  if (!ticket) return (
    <PageTransition>
      <EmptyState
        title="Ticket not found"
        description="The ticket you're looking for doesn't exist or has been removed."
      />
    </PageTransition>
  )

  return (
    <PageTransition>
      <PageHeader
        title={ticket.subject}
        actions={
          <Button variant="outline" onClick={() => navigate("/tickets")}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Comments ({comments?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!comments || comments.length === 0 ? (
                <EmptyState title="No comments" description="No comments have been added to this ticket yet." />
              ) : (
                comments.map((c) => (
                  <div key={c.id}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">{c.user_id ? `Staff #${c.user_id.slice(0, 4)}` : "System"}</span>
                      <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                      {c.is_internal && <StatusBadge status="internal" />}
                    </div>
                    <p className="text-sm">{c.comment}</p>
                    <Separator className="mt-3" />
                  </div>
                ))
              )}
              <form
                onSubmit={(e) => { e.preventDefault(); commentMut.mutate() }}
                className="flex gap-2 pt-2"
              >
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  required
                />
                <Button type="submit" size="icon" disabled={commentMut.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Status</span>
                <div className="mt-1">
                  <div className="flex gap-1 flex-wrap">
                    {["open", "in_progress", "resolved", "closed"].map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={ticket.status === s ? "default" : "outline"}
                        onClick={() => statusMut.mutate(s)}
                      >
                        {s.replace("_", " ")}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Priority</span>
                <div className="mt-1"><StatusBadge status={ticket.priority} /></div>
              </div>
              <div>
                <span className="text-muted-foreground">Customer</span>
                <div className="mt-1 font-medium">
                  {customer ? `${customer.first_name} ${customer.last_name}` : "—"}
                </div>
                <div className="text-xs text-muted-foreground">{customer?.phone}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Created</span>
                <div className="mt-1">{new Date(ticket.created_at).toLocaleDateString()}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  )
}
