import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { createCustomer, updateCustomer, getCustomer, type CustomerCreate } from "@/services/customers"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

export function CustomerFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const [form, setForm] = useState<CustomerCreate>({ first_name: "", last_name: "", phone: "" })
  const [saving, setSaving] = useState(false)

  const { data } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => getCustomer(id!),
    enabled: isEdit,
  })

  useEffect(() => {
    if (data) {
      setForm({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        email: data.email ?? undefined,
        id_number: data.id_number ?? undefined,
        kra_pin: data.kra_pin ?? undefined,
        mpesa_phone: data.mpesa_phone ?? undefined,
        physical_address: data.physical_address ?? undefined,
        service_address: data.service_address ?? undefined,
      })
    }
  }, [data])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (isEdit) {
        await updateCustomer(id!, form)
      } else {
        await createCustomer(form)
      }
      navigate(isEdit ? `/customers/${id}` : "/customers")
    } finally {
      setSaving(false)
    }
  }

  const update = (field: keyof CustomerCreate, value: string) =>
    setForm((f) => ({ ...f, [field]: value }))

  return (
    <div>
      <PageHeader title={isEdit ? "Edit Customer" : "New Customer"} />
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name</label>
                <Input value={form.first_name} onChange={(e) => update("first_name", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name</label>
                <Input value={form.last_name} onChange={(e) => update("last_name", e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="2547XXXXXXXX" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={form.email ?? ""} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">ID Number</label>
                <Input value={form.id_number ?? ""} onChange={(e) => update("id_number", e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">KRA PIN</label>
                <Input value={form.kra_pin ?? ""} onChange={(e) => update("kra_pin", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">M-Pesa Phone</label>
              <Input value={form.mpesa_phone ?? ""} onChange={(e) => update("mpesa_phone", e.target.value)} placeholder="For STK Push payments" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Physical Address</label>
              <Input value={form.physical_address ?? ""} onChange={(e) => update("physical_address", e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Address</label>
              <Input value={form.service_address ?? ""} onChange={(e) => update("service_address", e.target.value)} />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate(isEdit ? `/customers/${id}` : "/customers")}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
