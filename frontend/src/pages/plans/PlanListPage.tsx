import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { listPlans, createPlan, deletePlan, type Plan, type PlanCreate } from "@/services/plans"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Plus, Trash2 } from "lucide-react"
import { PLAN_TYPES, BILLING_CYCLES } from "@/lib/constants"

const columns: Column<Plan>[] = [
  { key: "name", header: "Name" },
  { key: "type", header: "Type", cell: (p) => <StatusBadge status={p.type} /> },
  { key: "speed", header: "Speed", cell: (p) => `${p.download_speed_mbps}/${p.upload_speed_mbps} Mbps` },
  { key: "price", header: "Price (KES)", cell: (p) => p.price.toLocaleString() },
  { key: "billing_cycle", header: "Cycle" },
  { key: "data_cap_gb", header: "Data Cap", cell: (p) => p.data_cap_gb ? `${p.data_cap_gb} GB` : "Unlimited" },
  { key: "is_active", header: "Active", cell: (p) => p.is_active ? "Yes" : "No" },
]

export function PlanListPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<PlanCreate>({
    name: "", type: "fiber", download_speed_mbps: 10, upload_speed_mbps: 10, price: 0,
  })

  const { data, isLoading } = useQuery({ queryKey: ["plans"], queryFn: () => listPlans() })

  const createMut = useMutation({
    mutationFn: () => createPlan(form),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["plans"] }); setOpen(false); setForm({ name: "", type: "fiber", download_speed_mbps: 10, upload_speed_mbps: 10, price: 0 }) },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePlan(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plans"] }),
  })

  return (
    <div>
      <PageHeader
        title="Plans"
        description="Internet service packages"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Plan</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Plan</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMut.mutate() }} className="space-y-4">
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
                <Button type="submit" disabled={createMut.isPending}>Create</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <DataTable columns={columns} data={data ?? []} loading={isLoading} />
    </div>
  )
}
