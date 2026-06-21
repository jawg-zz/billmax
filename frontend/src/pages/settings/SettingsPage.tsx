import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getSettings, saveSettings, saveOrganization } from "@/services/settings"
import { PageTransition } from "@/components/shared/PageTransition"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/ui/FormField"
import { useToast } from "@/components/ui/Toaster"
import { CardSkeleton } from "@/components/ui/Skeleton"
import { cn } from "@/lib/utils"

const tabs = ["General", "M-Pesa", "Email", "Provisioning", "Billing"] as const
type Tab = (typeof tabs)[number]

interface OrgForm {
  name: string
  address: string
  phone: string
  email: string
  kra_pin: string
}

interface MpesaForm {
  environment: string
  consumer_key: string
  consumer_secret: string
  passkey: string
  shortcode: string
  initiator_name: string
  security_credential: string
  callback_url: string
}

interface EmailForm {
  smtp_host: string
  smtp_port: string
  smtp_user: string
  smtp_password: string
  from_address: string
}

interface ProvisioningForm {
  backend: string
  routeros_host: string
  routeros_port: string
  routeros_username: string
  routeros_password: string
  radius_db_url: string
}

interface BillingForm {
  vat_rate: string
  invoice_due_days: string
  suspension_overdue_days: string
  auto_send_invoice: string
  currency: string
  timezone: string
}

const defaultOrg: OrgForm = { name: "", address: "", phone: "", email: "", kra_pin: "" }
const defaultMpesa: MpesaForm = {
  environment: "sandbox", consumer_key: "", consumer_secret: "", passkey: "",
  shortcode: "", initiator_name: "", security_credential: "", callback_url: "",
}
const defaultEmail: EmailForm = {
  smtp_host: "", smtp_port: "587", smtp_user: "", smtp_password: "", from_address: "",
}
const defaultProvisioning: ProvisioningForm = {
  backend: "mock", routeros_host: "", routeros_port: "8728",
  routeros_username: "", routeros_password: "", radius_db_url: "",
}
const defaultBilling: BillingForm = {
  vat_rate: "16", invoice_due_days: "30", suspension_overdue_days: "60",
  auto_send_invoice: "No", currency: "KES", timezone: "Africa/Nairobi",
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("General")
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [orgForm, setOrgForm] = useState<OrgForm>(defaultOrg)
  const [mpesaForm, setMpesaForm] = useState<MpesaForm>(defaultMpesa)
  const [emailForm, setEmailForm] = useState<EmailForm>(defaultEmail)
  const [provisioningForm, setProvisioningForm] = useState<ProvisioningForm>(defaultProvisioning)
  const [billingForm, setBillingForm] = useState<BillingForm>(defaultBilling)

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  })

  useEffect(() => {
    if (!data) return
    setOrgForm({
      name: data.organization?.name ?? "",
      address: data.organization?.address ?? "",
      phone: data.organization?.phone ?? "",
      email: data.organization?.email ?? "",
      kra_pin: data.organization?.kra_pin ?? "",
    })
    const c = data.config ?? {}
    setMpesaForm({
      environment: c.mpesa?.environment ?? "sandbox",
      consumer_key: c.mpesa?.consumer_key ?? "",
      consumer_secret: c.mpesa?.consumer_secret ?? "",
      passkey: c.mpesa?.passkey ?? "",
      shortcode: c.mpesa?.shortcode ?? "",
      initiator_name: c.mpesa?.initiator_name ?? "",
      security_credential: c.mpesa?.security_credential ?? "",
      callback_url: c.mpesa?.callback_url ?? "",
    })
    setEmailForm({
      smtp_host: c.email?.smtp_host ?? "",
      smtp_port: c.email?.smtp_port ?? "587",
      smtp_user: c.email?.smtp_user ?? "",
      smtp_password: c.email?.smtp_password ?? "",
      from_address: c.email?.from_address ?? "",
    })
    setProvisioningForm({
      backend: c.provisioning?.backend ?? "mock",
      routeros_host: c.provisioning?.routeros_host ?? "",
      routeros_port: c.provisioning?.routeros_port ?? "8728",
      routeros_username: c.provisioning?.routeros_username ?? "",
      routeros_password: c.provisioning?.routeros_password ?? "",
      radius_db_url: c.provisioning?.radius_db_url ?? "",
    })
    setBillingForm({
      vat_rate: c.billing?.vat_rate ?? "16",
      invoice_due_days: c.billing?.invoice_due_days ?? "30",
      suspension_overdue_days: c.billing?.suspension_overdue_days ?? "60",
      auto_send_invoice: c.billing?.auto_send_invoice ?? "No",
      currency: c.billing?.currency ?? "KES",
      timezone: c.billing?.timezone ?? "Africa/Nairobi",
    })
  }, [data])

  const orgMutation = useMutation({
    mutationFn: () =>
      saveOrganization({
        name: orgForm.name,
        address: orgForm.address,
        phone: orgForm.phone,
        email: orgForm.email,
        kra_pin: orgForm.kra_pin,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      toast("success", "Organization settings saved")
    },
    onError: () => {
      toast("error", "Failed to save organization settings")
    },
  })

  const configMutation = useMutation({
    mutationFn: (config: Record<string, any>) => saveSettings(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      toast("success", "Settings saved")
    },
    onError: () => {
      toast("error", "Failed to save settings")
    },
  })

  const handleSaveOrg = () => orgMutation.mutate()
  const handleSaveMpesa = () =>
    configMutation.mutate({
      ...data?.config,
      mpesa: {
        environment: mpesaForm.environment,
        consumer_key: mpesaForm.consumer_key,
        consumer_secret: mpesaForm.consumer_secret,
        passkey: mpesaForm.passkey,
        shortcode: mpesaForm.shortcode,
        initiator_name: mpesaForm.initiator_name,
        security_credential: mpesaForm.security_credential,
        callback_url: mpesaForm.callback_url,
      },
    })
  const handleSaveEmail = () =>
    configMutation.mutate({
      ...data?.config,
      email: {
        smtp_host: emailForm.smtp_host,
        smtp_port: emailForm.smtp_port,
        smtp_user: emailForm.smtp_user,
        smtp_password: emailForm.smtp_password,
        from_address: emailForm.from_address,
      },
    })
  const handleSaveProvisioning = () =>
    configMutation.mutate({
      ...data?.config,
      provisioning: {
        backend: provisioningForm.backend,
        routeros_host: provisioningForm.routeros_host,
        routeros_port: provisioningForm.routeros_port,
        routeros_username: provisioningForm.routeros_username,
        routeros_password: provisioningForm.routeros_password,
        radius_db_url: provisioningForm.radius_db_url,
      },
    })
  const handleSaveBilling = () =>
    configMutation.mutate({
      ...data?.config,
      billing: {
        vat_rate: billingForm.vat_rate,
        invoice_due_days: billingForm.invoice_due_days,
        suspension_overdue_days: billingForm.suspension_overdue_days,
        auto_send_invoice: billingForm.auto_send_invoice,
        currency: billingForm.currency,
        timezone: billingForm.timezone,
      },
    })

  const handleTestEmail = () => {
    toast("info", "Email test not yet implemented")
  }

  if (isLoading) {
    return (
      <PageTransition>
        <PageHeader title="Settings" description="Configure your ISP billing system" />
        <CardSkeleton count={3} />
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <PageHeader title="Settings" description="Configure your ISP billing system" />

      <div className="flex gap-1 mb-6 border-b pb-0">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "General" && (
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Organization Name">
              <Input value={orgForm.name} onChange={(e) => setOrgForm((f) => ({ ...f, name: e.target.value }))} placeholder="My ISP Ltd" />
            </FormField>
            <FormField label="Address">
              <Input value={orgForm.address} onChange={(e) => setOrgForm((f) => ({ ...f, address: e.target.value }))} placeholder="123 Kenyatta Ave, Nairobi" />
            </FormField>
            <FormField label="Phone">
              <Input value={orgForm.phone} onChange={(e) => setOrgForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+254 700 000 000" />
            </FormField>
            <FormField label="Email">
              <Input type="email" value={orgForm.email} onChange={(e) => setOrgForm((f) => ({ ...f, email: e.target.value }))} placeholder="info@myisp.co.ke" />
            </FormField>
            <FormField label="KRA PIN">
              <Input value={orgForm.kra_pin} onChange={(e) => setOrgForm((f) => ({ ...f, kra_pin: e.target.value }))} placeholder="P051234567Z" />
            </FormField>
            <div className="pt-4 border-t">
              <Button onClick={handleSaveOrg} disabled={orgMutation.isPending}>
                {orgMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "M-Pesa" && (
        <Card>
          <CardHeader>
            <CardTitle>M-Pesa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Environment">
              <select
                value={mpesaForm.environment}
                onChange={(e) => setMpesaForm((f) => ({ ...f, environment: e.target.value }))}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="sandbox">Sandbox</option>
                <option value="production">Production</option>
              </select>
            </FormField>
            <FormField label="Consumer Key">
              <Input type="password" value={mpesaForm.consumer_key} onChange={(e) => setMpesaForm((f) => ({ ...f, consumer_key: e.target.value }))} />
            </FormField>
            <FormField label="Consumer Secret">
              <Input type="password" value={mpesaForm.consumer_secret} onChange={(e) => setMpesaForm((f) => ({ ...f, consumer_secret: e.target.value }))} />
            </FormField>
            <FormField label="Passkey">
              <Input type="password" value={mpesaForm.passkey} onChange={(e) => setMpesaForm((f) => ({ ...f, passkey: e.target.value }))} />
            </FormField>
            <FormField label="Shortcode">
              <Input value={mpesaForm.shortcode} onChange={(e) => setMpesaForm((f) => ({ ...f, shortcode: e.target.value }))} placeholder="174379" />
            </FormField>
            <FormField label="Initiator Name">
              <Input value={mpesaForm.initiator_name} onChange={(e) => setMpesaForm((f) => ({ ...f, initiator_name: e.target.value }))} />
            </FormField>
            <FormField label="Security Credential">
              <Input type="password" value={mpesaForm.security_credential} onChange={(e) => setMpesaForm((f) => ({ ...f, security_credential: e.target.value }))} />
            </FormField>
            <FormField label="Callback URL">
              <Input value={mpesaForm.callback_url} onChange={(e) => setMpesaForm((f) => ({ ...f, callback_url: e.target.value }))} placeholder="https://yourdomain.com/api/v1/mpesa/callback" />
            </FormField>
            <div className="pt-4 border-t">
              <Button onClick={handleSaveMpesa} disabled={configMutation.isPending}>
                {configMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "Email" && (
        <Card>
          <CardHeader>
            <CardTitle>Email / SMTP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="SMTP Host">
              <Input value={emailForm.smtp_host} onChange={(e) => setEmailForm((f) => ({ ...f, smtp_host: e.target.value }))} placeholder="smtp.gmail.com" />
            </FormField>
            <FormField label="SMTP Port">
              <Input type="number" value={emailForm.smtp_port} onChange={(e) => setEmailForm((f) => ({ ...f, smtp_port: e.target.value }))} placeholder="587" />
            </FormField>
            <FormField label="SMTP User">
              <Input value={emailForm.smtp_user} onChange={(e) => setEmailForm((f) => ({ ...f, smtp_user: e.target.value }))} placeholder="user@example.com" />
            </FormField>
            <FormField label="SMTP Password">
              <Input type="password" value={emailForm.smtp_password} onChange={(e) => setEmailForm((f) => ({ ...f, smtp_password: e.target.value }))} />
            </FormField>
            <FormField label="From Address">
              <Input type="email" value={emailForm.from_address} onChange={(e) => setEmailForm((f) => ({ ...f, from_address: e.target.value }))} placeholder="billing@myisp.co.ke" />
            </FormField>
            <div className="pt-4 border-t flex gap-2">
              <Button onClick={handleSaveEmail} disabled={configMutation.isPending}>
                {configMutation.isPending ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={handleTestEmail}>
                Test Email
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "Provisioning" && (
        <Card>
          <CardHeader>
            <CardTitle>Provisioning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Backend">
              <select
                value={provisioningForm.backend}
                onChange={(e) => setProvisioningForm((f) => ({ ...f, backend: e.target.value }))}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="mock">Mock</option>
                <option value="routeros">RouterOS</option>
                <option value="freeradius">FreeRADIUS</option>
                <option value="both">Both</option>
              </select>
            </FormField>
            <FormField label="RouterOS Host">
              <Input value={provisioningForm.routeros_host} onChange={(e) => setProvisioningForm((f) => ({ ...f, routeros_host: e.target.value }))} placeholder="192.168.88.1" />
            </FormField>
            <FormField label="RouterOS Port">
              <Input type="number" value={provisioningForm.routeros_port} onChange={(e) => setProvisioningForm((f) => ({ ...f, routeros_port: e.target.value }))} placeholder="8728" />
            </FormField>
            <FormField label="RouterOS Username">
              <Input value={provisioningForm.routeros_username} onChange={(e) => setProvisioningForm((f) => ({ ...f, routeros_username: e.target.value }))} placeholder="admin" />
            </FormField>
            <FormField label="RouterOS Password">
              <Input type="password" value={provisioningForm.routeros_password} onChange={(e) => setProvisioningForm((f) => ({ ...f, routeros_password: e.target.value }))} />
            </FormField>
            <FormField label="RADIUS Database URL">
              <Input value={provisioningForm.radius_db_url} onChange={(e) => setProvisioningForm((f) => ({ ...f, radius_db_url: e.target.value }))} placeholder="mysql://user:pass@localhost:3306/radius" />
            </FormField>
            <div className="pt-4 border-t">
              <Button onClick={handleSaveProvisioning} disabled={configMutation.isPending}>
                {configMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "Billing" && (
        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="VAT Rate (%)">
              <Input type="number" value={billingForm.vat_rate} onChange={(e) => setBillingForm((f) => ({ ...f, vat_rate: e.target.value }))} placeholder="16" />
            </FormField>
            <FormField label="Invoice Due Days">
              <Input type="number" value={billingForm.invoice_due_days} onChange={(e) => setBillingForm((f) => ({ ...f, invoice_due_days: e.target.value }))} placeholder="30" />
            </FormField>
            <FormField label="Suspension Overdue Days">
              <Input type="number" value={billingForm.suspension_overdue_days} onChange={(e) => setBillingForm((f) => ({ ...f, suspension_overdue_days: e.target.value }))} placeholder="60" />
            </FormField>
            <FormField label="Auto-send Invoice Email">
              <select
                value={billingForm.auto_send_invoice}
                onChange={(e) => setBillingForm((f) => ({ ...f, auto_send_invoice: e.target.value }))}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </FormField>
            <FormField label="Currency">
              <Input value={billingForm.currency} onChange={(e) => setBillingForm((f) => ({ ...f, currency: e.target.value }))} placeholder="KES" />
            </FormField>
            <FormField label="Timezone">
              <Input value={billingForm.timezone} onChange={(e) => setBillingForm((f) => ({ ...f, timezone: e.target.value }))} placeholder="Africa/Nairobi" />
            </FormField>
            <div className="pt-4 border-t">
              <Button onClick={handleSaveBilling} disabled={configMutation.isPending}>
                {configMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </PageTransition>
  )
}
