import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { portalRegisterPlans, portalRegister, type RegisterPlan } from "@/services/portal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wifi, ArrowLeft, Check, Loader2 } from "lucide-react"

export function PortalRegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    password: "",
    confirm_password: "",
    id_number: "",
    physical_address: "",
    service_address: "",
  })
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["register-plans"],
    queryFn: () => portalRegisterPlans(),
  })

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleRegister = async () => {
    setError("")
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match")
      return
    }
    if (!selectedPlanId) {
      setError("Please select a plan")
      return
    }
    setLoading(true)
    try {
      await portalRegister({
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        email: form.email || undefined,
        password: form.password,
        id_number: form.id_number || undefined,
        physical_address: form.physical_address || undefined,
        service_address: form.service_address || undefined,
        plan_id: selectedPlanId,
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Registration Submitted!</CardTitle>
            <CardDescription className="text-base">
              Your account is pending approval. An administrator will activate your
              subscription shortly. You will be able to log in once approved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={() => navigate("/portal/login")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/portal/login")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold">Create Account</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {error && (
          <div className="text-sm bg-red-50 text-red-800 p-3 rounded-md mb-4">{error}</div>
        )}

        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Choose a Plan</h2>
            {plansLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading plans...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans?.map((plan) => (
                  <Card
                    key={plan.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedPlanId === plan.id ? "ring-2 ring-emerald-500 border-emerald-500" : ""
                    }`}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription>{plan.description || `${plan.type} plan`}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-3xl font-bold text-emerald-600">
                        KES {plan.price.toLocaleString()}
                        <span className="text-sm font-normal text-muted-foreground">/{plan.billing_cycle}</span>
                      </div>
                      {plan.setup_fee > 0 && (
                        <p className="text-sm text-muted-foreground">Setup fee: KES {plan.setup_fee.toLocaleString()}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <span>⬇ {plan.download_speed_mbps} Mbps</span>
                        <span>⬆ {plan.upload_speed_mbps} Mbps</span>
                      </div>
                      {plan.data_cap_gb && (
                        <p className="text-sm text-muted-foreground">{plan.data_cap_gb} GB data cap</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <Button
              className="w-full"
              disabled={!selectedPlanId}
              onClick={() => setStep(1)}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Your Details</h2>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">First Name *</label>
                    <Input value={form.first_name} onChange={(e) => updateField("first_name", e.target.value)} placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last Name *</label>
                    <Input value={form.last_name} onChange={(e) => updateField("last_name", e.target.value)} placeholder="Doe" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number *</label>
                  <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="2547XXXXXXXX" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">ID Number</label>
                  <Input value={form.id_number} onChange={(e) => updateField("id_number", e.target.value)} placeholder="National ID" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Physical Address</label>
                  <Input value={form.physical_address} onChange={(e) => updateField("physical_address", e.target.value)} placeholder="Your physical location" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Service Address</label>
                  <Input value={form.service_address} onChange={(e) => updateField("service_address", e.target.value)} placeholder="Installation address" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password *</label>
                    <Input type="password" value={form.password} onChange={(e) => updateField("password", e.target.value)} placeholder="Portal PIN" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirm Password *</label>
                    <Input type="password" value={form.confirm_password} onChange={(e) => updateField("confirm_password", e.target.value)} placeholder="Repeat PIN" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button className="flex-1" onClick={handleRegister} disabled={loading || !form.first_name || !form.last_name || !form.phone || !form.password}>
                {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Submit Registration
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
