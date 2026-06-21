import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { listSubscriptions, createSubscription, type Subscription, type SubscriptionCreate } from "@/services/subscriptions"
import { listPlans } from "@/services/plans"
import { listCustomers } from "@/services/customers"
import { provision, suspend, restore, changeSpeed } from "@/services/provisioning"
import { PageHeader } from "@/components/shared/PageHeader"
import { PageTransition } from "@/components/shared/PageTransition"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/ui/EmptyState"
import { FormField } from "@/components/ui/FormField"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/Toaster"
import { Plus, Wifi, WifiOff, RefreshCw, Zap, ExternalLink, Radio } from "lucide-react"

export function SubscriptionListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] })
  }

  const provisionMut = useMutation({
    mutationFn: (id: string) => provision(id),
    onSuccess: () => { invalidate(); toast("success", "Subscription provisioned on network") },
    onError: () => toast("error", "Provisioning failed"),
  })
  const suspendMut = useMutation({
    mutationFn: (id: string) => suspend(id),
    onSuccess: () => { invalidate(); toast("success", "Subscription suspended") },
    onError: () => toast("error", "Suspend failed"),
  })
  const restoreMut = useMutation({
    mutationFn: (id: string) => restore(id),
    onSuccess: () => { invalidate(); toast("success", "Subscription restored") },
    onError: () => toast("error", "Restore failed"),
  })
  const speedMut = useMutation({
    mutationFn: () => changeSpeed(speedSub!.id, newPlanId),
    onSuccess: () => { invalidate(); setSpeedSub(null); setNewPlanId(""); toast("success", "Plan changed") },
    onError: () => toast("error", "Speed change failed"),
  })
  const createMut = useMutation({
    mutationFn: () => createSubscription(form),
    onSuccess: () => {
      invalidate(); setCreateOpen(false); setForm({ customer_id: "", plan_id: "", next_billing_date: "" })
      toast("success", "Subscription created")
    },
    onError: () => toast("error", "Failed to create subscription"),
  })

  const columns: Column<Subscription>[] = [
    {
      key: "customer", header: "Customer", sortable: true,
      sortValue: (s) => { const c = custMap.get(s.customer_id); return c ? `${c.first_name} ${c.last_name}` : "" },
      cell: (s) => {
        const c = custMap.get(s.customer_id)
        return c ? (
          <button className="text-primary hover:underline font-medium" onClick={() => navigate(`/customers/${c.id}`)}>
            {c.first_name} {c.last_name}
          </button>
        ) : <span className="text-muted-foreground">{s.customer_id.slice(0, 8)}</span>
      },
    },
    {
      key: "plan", header: "Plan", sortable: true,
      sortValue: (s) => planMap.get(s.plan_id)?.name ?? "",
      cell: (s) => planMap.get(s.plan_id)?.name ?? <span className="text-muted-foreground">{s.plan_id.slice(0, 8)}</span>,
    },
    {
      key: "status", header: "Status", sortable: true,
      cell: (s) => <StatusBadge status={s.status} />,
    },
    { key: "next_billing_date", header: "Next Billing", sortable: true, hideOnMobile: true },
    {
      key: "provisioned", header: "Network", hideOnMobile: true,
      cell: (s) => s.provisioned
        ? <span className="inline-flex items-center gap-1 text-green-600 font-medium"><span className="h-1.5 w-1.5 rounded-full bg-green-600" />Active</span>
        : <span className="text-muted-foreground">—</span>,
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
            <Button variant="ghost" size="icon" title="Change Plan" onClick={() => { setSpeedSub(s); setNewPlanId("") }}>
              <Zap className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <PageTransition>
      <PageHeader
        title="Subscriptions"
        description={`${subs?.length ?? 0} active assignments`}
        actions={
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />New Subscription</Button>
        }
      />

      {!isLoading && (subs ?? []).length === 0 ? (
        <EmptyState
          icon={<Radio className="h-12 w-12" />}
          title="No subscriptions yet"
          description="Assign a plan to a customer to create a subscription"
          action={{ label: "New Subscription", onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <DataTable columns={columns} data={subs ?? []} loading={isLoading} pageSize={20} minWidth="700px" />
      )}

      <Dialog open={!!speedSub} onOpenChange={(o) => { if (!o) setSpeedSub(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Plan — {speedSub && planMap.get(speedSub.plan_id)?.name}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); speedMut.mutate() }} className="space-y-4">
            <FormField label="New Plan" required>
              <Select
                options={(plans ?? []).map((p) => ({ value: p.id, label: `${p.name} — KES ${p.price} (${p.download_speed_mbps}/${p.upload_speed_mbps} Mbps)` }))}
                value={newPlanId}
                onChange={(e) => setNewPlanId(e.target.value)}
                placeholder="Select plan"
                required
              />
            </FormField>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setSpeedSub(null)}>Cancel</Button>
              <Button type="submit" disabled={speedMut.isPending}>Change Plan</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Subscription</DialogTitle></DialogHeader>
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
            <FormField label="Plan" required>
              <Select
                options={(plans ?? []).map((p) => ({ value: p.id, label: `${p.name} — KES ${p.price}/mo` }))}
                value={form.plan_id}
                onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
                placeholder="Select plan"
                required
              />
            </FormField>
            <FormField label="Next Billing Date" required>
              <Input type="date" value={form.next_billing_date} onChange={(e) => setForm({ ...form, next_billing_date: e.target.value })} required />
            </FormField>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending}>Create Subscription</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
