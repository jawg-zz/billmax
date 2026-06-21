import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { listTickets, createTicket, type Ticket, type TicketCreate } from "@/services/tickets"
import { listCustomers } from "@/services/customers"
import { PageHeader } from "@/components/shared/PageHeader"
import { PageTransition } from "@/components/shared/PageTransition"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/ui/EmptyState"
import { FormField } from "@/components/ui/FormField"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/Toaster"
import { Plus, MessageSquare } from "lucide-react"

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
]

const statusTabs = ["", "open", "in_progress", "resolved", "closed"]

export function TicketListPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState("")
  const [form, setForm] = useState<TicketCreate>({ customer_id: "", subject: "", description: "" })

  const { data, isLoading } = useQuery({
    queryKey: ["tickets", filter],
    queryFn: () => listTickets(filter ? { status: filter } : undefined),
  })
  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: () => listCustomers() })

  const createMut = useMutation({
    mutationFn: () => createTicket(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
      setOpen(false); setForm({ customer_id: "", subject: "", description: "" })
      toast("success", "Ticket created")
    },
    onError: () => toast("error", "Failed to create ticket"),
  })

  const columns: Column<Ticket>[] = [
    { key: "subject", header: "Subject", sortable: true },
    {
      key: "priority", header: "Priority", sortable: true,
      sortValue: (t) => ({ low: 0, medium: 1, high: 2, critical: 3 }[t.priority] ?? 0),
      cell: (t) => <StatusBadge status={t.priority} />,
    },
    {
      key: "status", header: "Status", sortable: true,
      cell: (t) => <StatusBadge status={t.status} />,
    },
    {
      key: "customer_id", header: "Customer", sortable: true,
      cell: (t) => {
        const c = customers?.find((c) => c.id === t.customer_id)
        return c ? `${c.first_name} ${c.last_name}` : <span className="text-muted-foreground text-xs">{t.customer_id.slice(0, 8)}</span>
      },
    },
    {
      key: "created_at", header: "Date", sortable: true, hideOnMobile: true,
      sortValue: (t) => t.created_at,
      cell: (t) => new Date(t.created_at).toLocaleDateString(),
    },
  ]

  const statusCounts = (data ?? []).reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <PageTransition>
      <PageHeader
        title="Tickets"
        description={`${data?.length ?? 0} support tickets`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Ticket</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Ticket</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMut.mutate() }} className="space-y-4">
                <FormField label="Customer" required>
                  <Select
                    options={(customers ?? []).map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name} (${c.phone})` }))}
                    value={form.customer_id}
                    onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                    placeholder="Select customer"
                    required
                  />
                </FormField>
                <FormField label="Subject" required>
                  <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Brief issue summary" required />
                </FormField>
                <FormField label="Priority">
                  <Select options={priorityOptions} value={form.priority ?? "medium"} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
                </FormField>
                <FormField label="Description" required>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe the issue in detail"
                    required
                  />
                </FormField>
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMut.isPending}>Create Ticket</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {statusTabs.map((s) => (
          <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ") : "All"}
            {s && statusCounts[s] ? ` (${statusCounts[s]})` : ""}
          </Button>
        ))}
      </div>

      {!isLoading && (data ?? []).length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-12 w-12" />}
          title={filter ? "No tickets match this status" : "No support tickets yet"}
          description={filter ? "Try a different filter" : "Create a ticket when a customer reports an issue"}
          action={filter ? undefined : { label: "New Ticket", onClick: () => setOpen(true) }}
        />
      ) : (
        <DataTable columns={columns} data={data ?? []} loading={isLoading} pageSize={20} minWidth="600px" />
      )}
    </PageTransition>
  )
}
