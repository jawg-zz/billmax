import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  listCpeDevices, createCpeDevice, updateCpeDevice, deleteCpeDevice,
  assignCpeDevice, returnCpeDevice,
  listInventoryStock, createInventoryStock, updateInventoryStock,
  type CpeDevice, type CpeDeviceCreate, type CpeDeviceAssign,
  type InventoryItem, type InventoryItemCreate,
} from "@/services/inventory"
import { listCustomers } from "@/services/customers"
import { listSubscriptions } from "@/services/subscriptions"
import { PageHeader } from "@/components/shared/PageHeader"
import { PageTransition } from "@/components/shared/PageTransition"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { FormField } from "@/components/ui/FormField"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/EmptyState"
import { useToast } from "@/components/ui/Toaster"
import {
  Plus, Pencil, Trash2, Package, Monitor,
  ArrowLeftRight, RotateCcw,
} from "lucide-react"

const tabs = [
  { key: "cpe", label: "CPE Devices" },
  { key: "stock", label: "Stock" },
]

const DEVICE_TYPES = [
  { value: "router", label: "Router" },
  { value: "ont", label: "ONT" },
  { value: "cpe", label: "CPE" },
  { value: "antenna", label: "Antenna" },
  { value: "other", label: "Other" },
]

const DEVICE_STATUSES = [
  { value: "in_stock", label: "In Stock" },
  { value: "assigned", label: "Assigned" },
  { value: "defective", label: "Defective" },
  { value: "retired", label: "Retired" },
]

const emptyCpeForm = (): CpeDeviceCreate => ({
  serial_number: "", model: "", manufacturer: "",
  device_type: "router", status: "in_stock",
})

export function InventoryPage() {
  const [activeTab, setActiveTab] = useState("cpe")

  return (
    <PageTransition>
      <PageHeader
        title="Inventory"
        description="Manage CPE devices and stock"
      />
      <div className="flex gap-1 mb-6 border-b pb-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTab === t.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {activeTab === "cpe" ? <CpeDevicesTab /> : <StockTab />}
    </PageTransition>
  )
}

function CpeDevicesTab() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CpeDevice | null>(null)
  const [assignTarget, setAssignTarget] = useState<CpeDevice | null>(null)
  const [form, setForm] = useState<CpeDeviceCreate>(emptyCpeForm())
  const [assignForm, setAssignForm] = useState<CpeDeviceAssign>({ customer_id: "", subscription_id: "" })

  const { data: devices, isLoading } = useQuery({
    queryKey: ["cpe-devices"],
    queryFn: () => listCpeDevices(),
  })

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => listCustomers(),
  })

  const { data: subscriptions } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => listSubscriptions(),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["cpe-devices"] })

  const createMut = useMutation({
    mutationFn: () => createCpeDevice(form),
    onSuccess: () => {
      invalidate(); setCreateOpen(false); setForm(emptyCpeForm())
      toast("success", "CPE device created")
    },
    onError: () => toast("error", "Failed to create device"),
  })

  const updateMut = useMutation({
    mutationFn: () => updateCpeDevice(editTarget!.id, form),
    onSuccess: () => {
      invalidate(); setEditTarget(null); setForm(emptyCpeForm())
      toast("success", "CPE device updated")
    },
    onError: () => toast("error", "Failed to update device"),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCpeDevice(id),
    onSuccess: () => { invalidate(); toast("success", "Device deleted") },
    onError: () => toast("error", "Failed to delete device"),
  })

  const assignMut = useMutation({
    mutationFn: () => assignCpeDevice(assignTarget!.id, assignForm),
    onSuccess: () => {
      invalidate(); setAssignTarget(null); setAssignForm({ customer_id: "", subscription_id: "" })
      toast("success", "Device assigned")
    },
    onError: () => toast("error", "Failed to assign device"),
  })

  const returnMut = useMutation({
    mutationFn: (id: string) => returnCpeDevice(id),
    onSuccess: () => { invalidate(); toast("success", "Device returned to stock") },
    onError: () => toast("error", "Failed to return device"),
  })

  const openEdit = (d: CpeDevice) => {
    setEditTarget(d)
    setForm({
      serial_number: d.serial_number, model: d.model,
      manufacturer: d.manufacturer, device_type: d.device_type,
      status: d.status, notes: d.notes ?? undefined,
    })
  }

  const customerLookup = (id: string | null) => {
    if (!id || !customers) return null
    return customers.find((c) => c.id === id)
  }

  const columns: Column<CpeDevice>[] = [
    { key: "serial_number", header: "Serial", sortable: true },
    { key: "model", header: "Model", sortable: true },
    { key: "device_type", header: "Type", sortable: true, hideOnMobile: true },
    { key: "status", header: "Status", sortable: true,
      cell: (d) => {
        const colors: Record<string, string> = {
          in_stock: "bg-blue-500/10 text-blue-400",
          assigned: "bg-green-500/10 text-green-400",
          defective: "bg-red-500/10 text-red-400",
          retired: "bg-muted text-muted-foreground",
        }
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[d.status] || ""}`}>{d.status.replace("_", " ")}</span>
      }
    },
    {
      key: "customer", header: "Assigned To",
      cell: (d) => {
        const c = customerLookup(d.customer_id)
        return c ? `${c.first_name} ${c.last_name}` : <span className="text-muted-foreground">—</span>
      },
    },
    {
      key: "actions", header: "",
      cell: (d) => (
        <div className="flex gap-1">
          {d.status === "in_stock" && (
            <Button variant="ghost" size="icon" title="Assign" onClick={() => { setAssignTarget(d); setAssignForm({ customer_id: "", subscription_id: "" }) }}>
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
          )}
          {d.status === "assigned" && (
            <Button variant="ghost" size="icon" title="Return to stock" onClick={() => { if (confirm("Return this device to stock?")) returnMut.mutate(d.id) }}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(d)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Delete" onClick={() => { if (confirm("Delete this device?")) deleteMut.mutate(d.id) }}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  const formContent = (
    <>
      <FormField label="Serial Number" required>
        <Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} placeholder="e.g. SN-001" />
      </FormField>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Model" required>
          <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="e.g. RB750" />
        </FormField>
        <FormField label="Manufacturer" required>
          <Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="e.g. MikroTik" />
        </FormField>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Device Type" required>
          <Select options={DEVICE_TYPES} value={form.device_type} onChange={(e) => setForm({ ...form, device_type: e.target.value })} />
        </FormField>
        <FormField label="Status" required>
          <Select options={DEVICE_STATUSES} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} />
        </FormField>
      </div>
      <FormField label="Notes">
        <Input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
      </FormField>
    </>
  )

  return (
    <>
      <PageHeader
        title=""
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Device</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Add CPE Device</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMut.mutate() }} className="space-y-4">
                {formContent}
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMut.isPending}>Create</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      {!isLoading && (devices ?? []).length === 0 ? (
        <EmptyState
          icon={<Monitor className="h-12 w-12" />}
          title="No CPE devices"
          description="Add your first CPE device to start tracking equipment"
          action={{ label: "Add Device", onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <DataTable columns={columns} data={devices ?? []} loading={isLoading} pageSize={15} minWidth="700px" />
      )}

      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) { setEditTarget(null); setForm(emptyCpeForm()) } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Device — {editTarget?.serial_number}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateMut.mutate() }} className="space-y-4">
            {formContent}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setEditTarget(null); setForm(emptyCpeForm()) }}>Cancel</Button>
              <Button type="submit" disabled={updateMut.isPending}>Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignTarget} onOpenChange={(o) => { if (!o) { setAssignTarget(null); setAssignForm({ customer_id: "", subscription_id: "" }) } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Assign Device — {assignTarget?.serial_number}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <FormField label="Customer" required>
              <Select
                options={(customers ?? []).map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name} (${c.phone})` }))}
                placeholder="Select customer"
                value={assignForm.customer_id}
                onChange={(e) => setAssignForm({ ...assignForm, customer_id: e.target.value, subscription_id: "" })}
              />
            </FormField>
            <FormField label="Subscription" required>
              <Select
                options={(subscriptions ?? [])
                  .filter((s) => !assignForm.customer_id || s.customer_id === assignForm.customer_id)
                  .map((s) => ({ value: s.id, label: `${s.id.slice(0, 8)}... - ${s.status}` }))}
                placeholder="Select subscription"
                value={assignForm.subscription_id}
                onChange={(e) => setAssignForm({ ...assignForm, subscription_id: e.target.value })}
              />
            </FormField>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setAssignTarget(null); setAssignForm({ customer_id: "", subscription_id: "" }) }}>Cancel</Button>
              <Button onClick={() => assignMut.mutate()} disabled={assignMut.isPending || !assignForm.customer_id || !assignForm.subscription_id}>Assign</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function StockTab() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null)
  const [form, setForm] = useState<InventoryItemCreate>({
    name: "", category: "", quantity_in_stock: 0, unit_cost: 0,
    min_stock_level: 0,
  })

  const { data: items, isLoading } = useQuery({
    queryKey: ["inventory-stock"],
    queryFn: () => listInventoryStock(),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["inventory-stock"] })

  const createMut = useMutation({
    mutationFn: () => createInventoryStock(form),
    onSuccess: () => {
      invalidate(); setCreateOpen(false); setForm({ name: "", category: "", quantity_in_stock: 0, unit_cost: 0, min_stock_level: 0 })
      toast("success", "Stock item created")
    },
    onError: () => toast("error", "Failed to create stock item"),
  })

  const updateMut = useMutation({
    mutationFn: () => updateInventoryStock(editTarget!.id, form),
    onSuccess: () => {
      invalidate(); setEditTarget(null); setForm({ name: "", category: "", quantity_in_stock: 0, unit_cost: 0, min_stock_level: 0 })
      toast("success", "Stock item updated")
    },
    onError: () => toast("error", "Failed to update stock item"),
  })

  const openEdit = (item: InventoryItem) => {
    setEditTarget(item)
    setForm({
      name: item.name, category: item.category,
      quantity_in_stock: item.quantity_in_stock, unit_cost: item.unit_cost,
      supplier: item.supplier ?? undefined,
      min_stock_level: item.min_stock_level, notes: item.notes ?? undefined,
    })
  }

  const isLowStock = (item: InventoryItem) =>
    item.min_stock_level > 0 && item.quantity_in_stock <= item.min_stock_level

  const columns: Column<InventoryItem>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "category", header: "Category", sortable: true, hideOnMobile: true },
    {
      key: "quantity_in_stock", header: "Qty In Stock", sortable: true,
      sortValue: (i) => i.quantity_in_stock,
      cell: (i) => (
        <span className={isLowStock(i) ? "text-destructive font-bold" : ""}>
          {i.quantity_in_stock}
          {isLowStock(i) && <span className="ml-1 text-destructive">⚠ Low</span>}
        </span>
      ),
    },
    {
      key: "unit_cost", header: "Unit Cost", sortable: true,
      sortValue: (i) => i.unit_cost,
      cell: (i) => <span className="tabular-nums">KES {i.unit_cost.toLocaleString()}</span>,
    },
    {
      key: "min_stock_level", header: "Min Stock Level",
      cell: (i) => i.min_stock_level > 0 ? i.min_stock_level : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "actions", header: "",
      cell: (i) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(i)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  // Apply low stock highlighting via row styling
  const dataWithClass = (items ?? []).map((item) => ({
    ...item,
    _rowClass: isLowStock(item) ? "bg-destructive/5" : "",
  }))

  return (
    <>
      <PageHeader
        title=""
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Stock Item</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Add Stock Item</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMut.mutate() }} className="space-y-4">
                <FormField label="Name" required>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. CAT6 Cable" />
                </FormField>
                <FormField label="Category" required>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Cabling" />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Quantity" required>
                    <Input type="number" value={form.quantity_in_stock} onChange={(e) => setForm({ ...form, quantity_in_stock: +e.target.value })} min={0} />
                  </FormField>
                  <FormField label="Unit Cost (KES)" required>
                    <Input type="number" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: +e.target.value })} min={0} />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Supplier">
                    <Input value={form.supplier ?? ""} onChange={(e) => setForm({ ...form, supplier: e.target.value })} placeholder="Optional" />
                  </FormField>
                  <FormField label="Min Stock Level">
                    <Input type="number" value={form.min_stock_level ?? 0} onChange={(e) => setForm({ ...form, min_stock_level: +e.target.value })} min={0} />
                  </FormField>
                </div>
                <FormField label="Notes">
                  <Input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
                </FormField>
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMut.isPending}>Create</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      {!isLoading && (items ?? []).length === 0 ? (
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title="No stock items"
          description="Add inventory stock items to track supplies"
          action={{ label: "Add Stock Item", onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <DataTable columns={columns} data={dataWithClass} loading={isLoading} pageSize={15} minWidth="600px" />
      )}

      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) { setEditTarget(null); setForm({ name: "", category: "", quantity_in_stock: 0, unit_cost: 0, min_stock_level: 0 }) } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Stock — {editTarget?.name}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateMut.mutate() }} className="space-y-4">
            <FormField label="Name" required>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FormField>
            <FormField label="Category" required>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </FormField>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Quantity" required>
                <Input type="number" value={form.quantity_in_stock} onChange={(e) => setForm({ ...form, quantity_in_stock: +e.target.value })} min={0} />
              </FormField>
              <FormField label="Unit Cost (KES)" required>
                <Input type="number" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: +e.target.value })} min={0} />
              </FormField>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Supplier">
                <Input value={form.supplier ?? ""} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
              </FormField>
              <FormField label="Min Stock Level">
                <Input type="number" value={form.min_stock_level ?? 0} onChange={(e) => setForm({ ...form, min_stock_level: +e.target.value })} min={0} />
              </FormField>
            </div>
            <FormField label="Notes">
              <Input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </FormField>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setEditTarget(null); setForm({ name: "", category: "", quantity_in_stock: 0, unit_cost: 0, min_stock_level: 0 }) }}>Cancel</Button>
              <Button type="submit" disabled={updateMut.isPending}>Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
