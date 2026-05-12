import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { listTickets, createTicket, type Ticket, type TicketCreate } from "@/services/tickets"
import { listCustomers } from "@/services/customers"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus } from "lucide-react"

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
]

const columns: Column<Ticket>[] = [
  { key: "subject", header: "Subject" },
  { key: "priority", header: "Priority", cell: (t) => <StatusBadge status={t.priority} /> },
  { key: "status", header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
  { key: "customer_id", header: "Customer", cell: (t) => t.customer_id.slice(0, 8) },
  { key: "created_at", header: "Date", cell: (t) => new Date(t.created_at).toLocaleDateString() },
]

export function TicketListPage() {
  const queryClient = useQueryClient()
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tickets"] }); setOpen(false) },
  })

  return (
    <div>
      <PageHeader
        title="Tickets"
        description="Customer support tickets"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Ticket</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Ticket</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMut.mutate() }} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Customer</label>
                  <Select
                    options={(customers ?? []).map((c) => ({
                      value: c.id, label: `${c.first_name} ${c.last_name} (${c.phone})`
                    }))}
                    value={form.customer_id}
                    onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                    placeholder="Select customer"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority</label>
                  <Select options={priorityOptions} value={form.priority ?? "medium"} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    className="flex h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" disabled={createMut.isPending}>Create</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="flex gap-2 mb-4">
        {["", "open", "in_progress", "resolved", "closed"].map((s) => (
          <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)}>
            {s || "All"}
          </Button>
        ))}
      </div>
      <DataTable
        columns={columns}
        data={data ?? []}
        loading={isLoading}
        emptyMessage="No tickets found"
      />
    </div>
  )
}
