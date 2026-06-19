import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { listPlans, createPlan, updatePlan, deletePlan, type Plan, type PlanCreate } from "@/services/plans"
import { PageHeader } from "@/components/shared/PageHeader"
import { PageTransition } from "@/components/shared/PageTransition"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/ui/FormField"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/ui/EmptyState"
import { useToast } from "@/components/ui/Toaster"
import { Plus, Pencil, Trash2, Radio } from "lucide-react"
import { PLAN_TYPES, BILLING_CYCLES } from "@/lib/constants"

const emptyForm = (): PlanCreate => ({
  name: "", type: "fiber", download_speed_mbps: 10, upload_speed_mbps: 10, price: 0,
})

interface FormErrors {
  name?: string
  price?: string
  download_speed_mbps?: string
}

export function PlanListPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Plan | null>(null)
  const [form, setForm] = useState<PlanCreate>(emptyForm())
  const [errors, setErrors] = useState<FormErrors>({})

  const { data, isLoading } = useQuery({ queryKey: ["plans"], queryFn: () => listPlans() })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["plans"] })

  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!form.name.trim()) e.name = "Plan name is required"
    if (form.price <= 0) e.price = "Price must be greater than 0"
    if (form.download_speed_mbps <= 0) e.download_speed_mbps = "Download speed is required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const createMut = useMutation({
    mutationFn: () => createPlan(form),
    onSuccess: () => {
      invalidate(); setCreateOpen(false); setForm(emptyForm()); setErrors({})
      toast("success", "Plan created")
    },
    onError: () => toast("error", "Failed to create plan"),
  })

  const updateMut = useMutation({
    mutationFn: () => updatePlan(editTarget!.id, form),
    onSuccess: () => {
      invalidate(); setEditTarget(null); setForm(emptyForm()); setErrors({})
      toast("success", "Plan updated")
    },
    onError: () => toast("error", "Failed to update plan"),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePlan(id),
    onSuccess: () => {
      invalidate()
      toast("success", "Plan deleted")
    },
    onError: () => toast("error", "Failed to delete plan"),
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
    setErrors({})
  }

  const formContent = (
    <>
      <FormField label="Plan Name" error={errors.name} required>
        <Input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: undefined }) }} placeholder="e.g. Fiber 20Mbps" />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Type" required>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {PLAN_TYPES.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </FormField>
        <FormField label="Billing Cycle" required>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={form.billing_cycle} onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })}
          >
            {BILLING_CYCLES.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Download (Mbps)" error={errors.download_speed_mbps} required>
          <Input type="number" value={form.download_speed_mbps} onChange={(e) => { setForm({ ...form, download_speed_mbps: +e.target.value }); setErrors({ ...errors, download_speed_mbps: undefined }) }} min={1} />
        </FormField>
        <FormField label="Upload (Mbps)" required>
          <Input type="number" value={form.upload_speed_mbps} onChange={(e) => setForm({ ...form, upload_speed_mbps: +e.target.value })} min={1} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Price (KES)" error={errors.price} required>
          <Input type="number" value={form.price} onChange={(e) => { setForm({ ...form, price: +e.target.value }); setErrors({ ...errors, price: undefined }) }} min={1} />
        </FormField>
        <FormField label="Setup Fee (KES)">
          <Input type="number" value={form.setup_fee ?? 0} onChange={(e) => setForm({ ...form, setup_fee: +e.target.value })} min={0} />
        </FormField>
      </div>
      <FormField label="Data Cap (GB, blank = unlimited)">
        <Input type="number" value={form.data_cap_gb ?? ""} onChange={(e) => setForm({ ...form, data_cap_gb: e.target.value ? +e.target.value : undefined })} min={1} />
      </FormField>
    </>
  )

  const columns: Column<Plan>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "type", header: "Type", sortable: true, cell: (p) => <StatusBadge status={p.type} /> },
    {
      key: "speed", header: "Speed", sortable: true,
      sortValue: (p) => p.download_speed_mbps,
      cell: (p) => `${p.download_speed_mbps}/${p.upload_speed_mbps} Mbps`,
    },
    {
      key: "price", header: "Price (KES)", sortable: true,
      sortValue: (p) => p.price,
      cell: (p) => <span className="font-medium tabular-nums">KES {p.price.toLocaleString()}</span>,
    },
    { key: "billing_cycle", header: "Cycle", sortable: true },
    {
      key: "data_cap_gb", header: "Data Cap",
      cell: (p) => p.data_cap_gb ? `${p.data_cap_gb} GB` : <span className="text-muted-foreground">Unlimited</span>,
    },
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
    <PageTransition>
      <PageHeader
        title="Plans"
        description={`${data?.length ?? 0} internet service packages`}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Plan</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Create Plan</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); if (validate()) createMut.mutate() }} className="space-y-4">
                {formContent}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMut.isPending}>Create</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {!isLoading && (data ?? []).length === 0 ? (
        <EmptyState
          icon={<Radio className="h-12 w-12" />}
          title="No plans yet"
          description="Create your first internet service package to start selling"
          action={{ label: "New Plan", onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <DataTable columns={columns} data={data ?? []} loading={isLoading} pageSize={15} />
      )}

      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) { setEditTarget(null); setForm(emptyForm()); setErrors({}) } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Plan — {editTarget?.name}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (validate()) updateMut.mutate() }} className="space-y-4">
            {formContent}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setEditTarget(null); setForm(emptyForm()); setErrors({}) }}>Cancel</Button>
              <Button type="submit" disabled={updateMut.isPending}>Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
