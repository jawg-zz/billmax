import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { listPlans, createPlan, updatePlan, deletePlan, type Plan, type PlanCreate } from "@/services/plans"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { PLAN_TYPES, BILLING_CYCLES } from "@/lib/constants"

const emptyForm = (): PlanCreate => ({
  name: "", type: "fiber", download_speed_mbps: 10, upload_speed_mbps: 10, price: 0,
})

export function PlanListPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Plan | null>(null)
  const [form, setForm] = useState<PlanCreate>(emptyForm())

  const { data, isLoading } = useQuery({ queryKey: ["plans"], queryFn: () => listPlans() })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["plans"] })

  const createMut = useMutation({
    mutationFn: () => createPlan(form),
    onSuccess: () => { invalidate(); setCreateOpen(false); setForm(emptyForm()) },
  })

  const updateMut = useMutation({
    mutationFn: () => updatePlan(editTarget!.id, form),
    onSuccess: () => { invalidate(); setEditTarget(null); setForm(emptyForm()) },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePlan(id),
    onSuccess: invalidate,
  })

  const openEdit = (plan: Plan) => {
    setEditTarget(plan)
    setForm({
      name: plan.name, type: plan.type,
      download_speed_mbps: plan.download_speed_mbps,
      upload_speed_mbps: plan.upload_speed_mbps,
      price: plan.price, setup_fee: plan.setup_fee,
      billing_cycle: plan.billing_cycle,
      data_cap_gb: plan.data_cap_gb ?? undefined,
      description: plan.description ?? undefined,
    })
  }

  const formContent = (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Type</label>
          <Select options={PLAN_TYPES} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Billing Cycle</label>
          <Select options={BILLING_CYCLES} value={form.billing_cycle} onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Download (Mbps)</label>
          <Input type="number" value={form.download_speed_mbps} onChange={(e) => setForm({ ...form, download_speed_mbps: +e.target.value })} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Upload (Mbps)</label>
          <Input type="number" value={form.upload_speed_mbps} onChange={(e) => setForm({ ...form, upload_speed_mbps: +e.target.value })} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Price (KES)</label>
          <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Setup Fee</label>
          <Input type="number" value={form.setup_fee ?? 0} onChange={(e) => setForm({ ...form, setup_fee: +e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Data Cap (GB, blank = unlimited)</label>
        <Input type="number" value={form.data_cap_gb ?? ""} onChange={(e) => setForm({ ...form, data_cap_gb: e.target.value ? +e.target.value : undefined })} />
      </div>
    </>
  )

  const columns: Column<Plan>[] = [
    { key: "name", header: "Name" },
    { key: "type", header: "Type", cell: (p) => <StatusBadge status={p.type} /> },
    { key: "speed", header: "Speed", cell: (p) => `${p.download_speed_mbps}/${p.upload_speed_mbps} Mbps` },
    { key: "price", header: "Price (KES)", cell: (p) => p.price.toLocaleString() },
    { key: "billing_cycle", header: "Cycle" },
    { key: "data_cap_gb", header: "Data Cap", cell: (p) => p.data_cap_gb ? `${p.data_cap_gb} GB` : "Unlimited" },
    {
      key: "actions", header: "",
      cell: (p) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(p)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Delete" onClick={() => { if (confirm("Delete this plan?")) deleteMut.mutate(p.id) }}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Plans"
        description="Internet service packages"
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Plan</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Plan</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMut.mutate() }} className="space-y-4">
                {formContent}
                <Button type="submit" disabled={createMut.isPending}>Create</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <DataTable columns={columns} data={data ?? []} loading={isLoading} />

      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) { setEditTarget(null); setForm(emptyForm()) } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Plan — {editTarget?.name}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateMut.mutate() }} className="space-y-4">
            {formContent}
            <Button type="submit" disabled={updateMut.isPending}>Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
