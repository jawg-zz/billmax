import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { createCustomer, updateCustomer, getCustomer, type CustomerCreate } from "@/services/customers"
import { PageHeader } from "@/components/shared/PageHeader"
import { PageTransition } from "@/components/shared/PageTransition"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/ui/FormField"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/Toaster"
import { ArrowLeft } from "lucide-react"

export function CustomerFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const { toast } = useToast()
  const [form, setForm] = useState<CustomerCreate>({ first_name: "", last_name: "", phone: "" })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

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

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.first_name.trim()) e.first_name = "First name is required"
    if (!form.last_name.trim()) e.last_name = "Last name is required"
    if (!form.phone.trim()) e.phone = "Phone is required"
    else if (!/^\+?254\d{9}$|^0\d{9}$/.test(form.phone.replace(/\s/g, "")))
      e.phone = "Use a valid Kenyan phone (e.g. 2547XXXXXXXX)"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      if (isEdit) {
        await updateCustomer(id!, form)
        toast("success", "Customer updated")
        navigate(`/customers/${id}`)
      } else {
        await createCustomer(form)
        toast("success", "Customer created")
        navigate("/customers")
      }
    } catch {
      toast("error", isEdit ? "Failed to update customer" : "Failed to create customer")
    } finally {
      setSaving(false)
    }
  }

  const update = (field: keyof CustomerCreate, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => { const { [field]: _, ...rest } = e; return rest })
  }

  return (
    <PageTransition>
      <PageHeader
        title={isEdit ? "Edit Customer" : "New Customer"}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(isEdit ? `/customers/${id}` : "/customers")}>
              <ArrowLeft className="h-4 w-4 mr-2" />Back
            </Button>
          </div>
        }
      />
      <Card className="max-w-2xl">
        <CardContent className="p-4 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="First Name" error={errors.first_name} required>
                <Input value={form.first_name} onChange={(e) => update("first_name", e.target.value)} placeholder="John" />
              </FormField>
              <FormField label="Last Name" error={errors.last_name} required>
                <Input value={form.last_name} onChange={(e) => update("last_name", e.target.value)} placeholder="Kamau" />
              </FormField>
            </div>
            <FormField label="Phone" error={errors.phone} required>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="2547XXXXXXXX" />
            </FormField>
            <FormField label="Email">
              <Input type="email" value={form.email ?? ""} onChange={(e) => update("email", e.target.value)} placeholder="john@example.com" />
            </FormField>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="ID Number">
                <Input value={form.id_number ?? ""} onChange={(e) => update("id_number", e.target.value)} placeholder="12345678" />
              </FormField>
              <FormField label="KRA PIN">
                <Input value={form.kra_pin ?? ""} onChange={(e) => update("kra_pin", e.target.value)} placeholder="P051234567Z" />
              </FormField>
            </div>
            <FormField label="M-Pesa Phone (for STK Push)">
              <Input value={form.mpesa_phone ?? ""} onChange={(e) => update("mpesa_phone", e.target.value)} placeholder="2547XXXXXXXX" />
            </FormField>
            <FormField label="Physical Address">
              <Input value={form.physical_address ?? ""} onChange={(e) => update("physical_address", e.target.value)} placeholder="123 Kenyatta Ave, Nairobi" />
            </FormField>
            <FormField label="Service Address">
              <Input value={form.service_address ?? ""} onChange={(e) => update("service_address", e.target.value)} placeholder="Installation address" />
            </FormField>
            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Customer"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(isEdit ? `/customers/${id}` : "/customers")}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageTransition>
  )
}
