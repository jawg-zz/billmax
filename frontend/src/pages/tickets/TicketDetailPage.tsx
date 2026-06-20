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
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{ticket.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Comments ({comments?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {!comments || comments.length === 0 ? (
                <EmptyState title="No comments" description="No comments have been added to this ticket yet." />
              ) : (
                <div className="space-y-0">
                  {comments.map((c, idx) => {
                    const userName = c.user_id ? `Staff #${c.user_id.slice(0, 4)}` : "System"
                    const avatarLetter = userName.charAt(0)
                    return (
                      <div key={c.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-medium text-primary">{avatarLetter}</span>
                          </div>
                          {idx < comments.length - 1 && (
                            <div className="w-px flex-1 bg-border/60 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pb-5">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">{userName}</span>
                            <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                            {c.is_internal && <StatusBadge status="internal" />}
                          </div>
                          <p className="text-sm text-muted-foreground">{c.comment}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <Separator className="my-4" />
              <form
                onSubmit={(e) => { e.preventDefault(); commentMut.mutate() }}
                className="flex gap-2"
              >
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  required
                  className="flex-1"
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
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Status</p>
                <div className="flex gap-1.5 flex-wrap">
                  {["open", "in_progress", "resolved", "closed"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => statusMut.mutate(s)}
                      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                        ticket.status === s
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Priority</p>
                <StatusBadge status={ticket.priority} />
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Customer</p>
                <p className="font-medium">
                  {customer ? `${customer.first_name} ${customer.last_name}` : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{customer?.phone}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <p className="font-medium">{new Date(ticket.created_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  )
}
