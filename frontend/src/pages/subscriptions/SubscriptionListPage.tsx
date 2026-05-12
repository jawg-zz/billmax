import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { listSubscriptions, createSubscription, type Subscription, type SubscriptionCreate } from "@/services/subscriptions"
import { listPlans } from "@/services/plans"
import { listCustomers } from "@/services/customers"
import { provision, suspend, restore, changeSpeed } from "@/services/provisioning"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Wifi, WifiOff, RefreshCw, Zap, ExternalLink } from "lucide-react"

export function SubscriptionListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [speedSub, setSpeedSub] = useState<Subscription | null>(null)
  const [newPlanId, setNewPlanId] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<SubscriptionCreate>({
    customer_id: "", plan_id: "", next_billing_date: "",
  })

  const { data: subs, isLoading } = useQuery({ queryKey: ["subscriptions"], queryFn: () => listSubscriptions() })
  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: () => listCustomers() })
  const { data: plans } = useQuery({ queryKey: ["plans"], queryFn: () => listPlans() })

  const custMap = new Map(customers?.map((c) => [c.id, c]))
  const planMap = new Map(plans?.map((p) => [p.id, p]))

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["subscriptions"] })

  const provisionMut = useMutation({ mutationFn: (id: string) => provision(id), onSuccess: invalidate })
  const suspendMut = useMutation({ mutationFn: (id: string) => suspend(id), onSuccess: invalidate })
  const restoreMut = useMutation({ mutationFn: (id: string) => restore(id), onSuccess: invalidate })
  const speedMut = useMutation({
    mutationFn: () => changeSpeed(speedSub!.id, newPlanId),
    onSuccess: () => { invalidate(); setSpeedSub(null); setNewPlanId("") },
  })
  const createMut = useMutation({
    mutationFn: () => createSubscription(form),
    onSuccess: () => { invalidate(); setCreateOpen(false); setForm({ customer_id: "", plan_id: "", next_billing_date: "" }) },
  })

  const columns: Column<Subscription>[] = [
    {
      key: "customer", header: "Customer",
      cell: (s) => {
        const c = custMap.get(s.customer_id)
        return c ? `${c.first_name} ${c.last_name}` : s.customer_id.slice(0, 8)
      },
    },
    {
      key: "plan", header: "Plan",
      cell: (s) => planMap.get(s.plan_id)?.name ?? s.plan_id.slice(0, 8),
    },
    { key: "status", header: "Status", cell: (s) => <StatusBadge status={s.status} /> },
    { key: "next_billing_date", header: "Next Billing" },
    {
      key: "provisioned", header: "Network",
      cell: (s) => s.provisioned ? <span className="text-green-600 font-medium">Active</span> : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "actions", header: "",
      cell: (s) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" title="View Details" onClick={() => navigate(`/subscriptions/${s.id}`)}>
            <ExternalLink className="h-4 w-4" />
          </Button>
          {!s.provisioned && (
            <Button variant="ghost" size="icon" title="Provision" onClick={() => provisionMut.mutate(s.id)} disabled={provisionMut.isPending}>
              <Wifi className="h-4 w-4 text-green-600" />
            </Button>
          )}
          {s.provisioned && s.status !== "suspended" && (
            <Button variant="ghost" size="icon" title="Suspend" onClick={() => suspendMut.mutate(s.id)} disabled={suspendMut.isPending}>
              <WifiOff className="h-4 w-4 text-orange-600" />
            </Button>
          )}
          {s.provisioned && s.status === "suspended" && (
            <Button variant="ghost" size="icon" title="Restore" onClick={() => restoreMut.mutate(s.id)} disabled={restoreMut.isPending}>
              <RefreshCw className="h-4 w-4 text-green-600" />
            </Button>
          )}
          {s.provisioned && (
            <Button variant="ghost" size="icon" title="Change Speed" onClick={() => { setSpeedSub(s); setNewPlanId("") }}>
              <Zap className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        description="Customer plan assignments. Provision, suspend, or change speeds."
        actions={
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New Subscription</Button>
        }
      />
      <DataTable columns={columns} data={subs ?? []} loading={isLoading} />

      <Dialog open={!!speedSub} onOpenChange={(o) => { if (!o) setSpeedSub(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Plan — {speedSub && planMap.get(speedSub.plan_id)?.name}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); speedMut.mutate() }} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Plan</label>
              <Select
                options={(plans ?? []).map((p) => ({ value: p.id, label: `${p.name} — KES ${p.price} (${p.download_speed_mbps}/${p.upload_speed_mbps} Mbps)` }))}
                value={newPlanId}
                onChange={(e) => setNewPlanId(e.target.value)}
                placeholder="Select plan"
                required
              />
            </div>
            <Button type="submit" disabled={speedMut.isPending}>Change Speed</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Subscription</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMut.mutate() }} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer</label>
              <Select
                options={(customers ?? []).map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name} (${c.phone})` }))}
                value={form.customer_id}
                onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                placeholder="Select customer"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Plan</label>
              <Select
                options={(plans ?? []).map((p) => ({ value: p.id, label: `${p.name} — KES ${p.price}/mo` }))}
                value={form.plan_id}
                onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
                placeholder="Select plan"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Next Billing Date</label>
              <Input type="date" value={form.next_billing_date} onChange={(e) => setForm({ ...form, next_billing_date: e.target.value })} required />
            </div>
            <Button type="submit" disabled={createMut.isPending}>Create Subscription</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
