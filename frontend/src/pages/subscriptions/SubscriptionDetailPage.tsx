import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { getSubscription } from "@/services/subscriptions"
import { getCustomer } from "@/services/customers"
import { getPlan } from "@/services/plans"
import { listInvoices, type Invoice } from "@/services/invoices"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Wifi, User, Radio, Receipt } from "lucide-react"
import { PageTransition } from "@/components/shared/PageTransition"
import { CardSkeleton } from "@/components/ui/Skeleton"
import { EmptyState } from "@/components/ui/EmptyState"
import api from "@/services/api"

const invoiceCols: Column<Invoice>[] = [
  { key: "invoice_number", header: "#" },
  { key: "total", header: "Total", cell: (i) => `KES ${i.total.toLocaleString()}` },
  { key: "balance_due", header: "Balance", cell: (i) => `KES ${i.balance_due.toLocaleString()}` },
  { key: "due_date", header: "Due" },
  { key: "status", header: "Status", cell: (i) => <StatusBadge status={i.status} /> },
]

export function SubscriptionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: sub, isLoading } = useQuery({
    queryKey: ["subscription", id],
    queryFn: () => getSubscription(id!),
    enabled: !!id,
  })

  const { data: customer } = useQuery({
    queryKey: ["customer", sub?.customer_id],
    queryFn: () => getCustomer(sub!.customer_id),
    enabled: !!sub?.customer_id,
  })

  const { data: plan } = useQuery({
    queryKey: ["plan", sub?.plan_id],
    queryFn: () => getPlan(sub!.plan_id),
    enabled: !!sub?.plan_id,
  })

  const { data: invoices } = useQuery({
    queryKey: ["invoices", "sub", id],
    queryFn: () => listInvoices({ customer_id: sub!.customer_id }),
    enabled: !!sub?.customer_id,
  })

  const { data: provLogs } = useQuery({
    queryKey: ["provisioning-logs", id],
    queryFn: () => api.get("/provisioning/logs", { params: { subscription_id: id } }).then((r) => r.data),
    enabled: !!id,
  })

  if (isLoading) return (
    <PageTransition>
      <CardSkeleton count={4} />
    </PageTransition>
  )
  if (!sub) return (
    <PageTransition>
      <EmptyState
        title="Subscription not found"
        description="The subscription you're looking for doesn't exist or has been removed."
      />
    </PageTransition>
  )

  const subInvoices = (invoices ?? []).filter((inv) => inv.subscription_id === id)

  return (
    <PageTransition>
      <PageHeader
        title={`${plan?.name ?? "Subscription"} — ${customer?.first_name ?? ""} ${customer?.last_name ?? ""}`}
        actions={
          <Button variant="outline" onClick={() => navigate("/subscriptions")}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Customer</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {customer ? `${customer.first_name} ${customer.last_name}` : "—"}
            <div className="text-xs text-muted-foreground">{customer?.phone}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Radio className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Plan</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {plan?.name ?? "—"}
            <div className="text-xs text-muted-foreground">{plan?.download_speed_mbps}/{plan?.upload_speed_mbps} Mbps — KES {plan?.price.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Wifi className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent><StatusBadge status={sub.status} /></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Next Billing</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{sub.next_billing_date}</CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Details</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">Provisioned</span><span>{sub.provisioned ? "Yes" : "No"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Username</span><span>{sub.provisioned_username || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Auto Renew</span><span>{sub.auto_renew ? "Yes" : "No"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Start Date</span><span>{new Date(sub.created_at).toLocaleDateString()}</span></div>
          </CardContent>
        </Card>
        {sub.notes && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Notes</CardTitle></CardHeader>
            <CardContent className="text-sm">{sub.notes}</CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Invoices ({subInvoices.length})</h2>
          {subInvoices.length === 0 ? (
            <EmptyState title="No invoices" description="This subscription has no invoices yet." />
          ) : (
            <DataTable columns={invoiceCols} data={subInvoices} />
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">Provisioning History ({provLogs?.length ?? 0})</h2>
          {!provLogs || provLogs.length === 0 ? (
            <EmptyState title="No provisioning history" description="No provisioning logs found for this subscription." />
          ) : (
            <DataTable
              columns={[
                { key: "action", header: "Action" },
                { key: "backend", header: "Backend" },
                { key: "status", header: "Status", cell: (l: any) => <StatusBadge status={l.status} /> },
                { key: "error", header: "Error", cell: (l: any) => l.error || "—" },
                { key: "created_at", header: "Date", cell: (l: any) => new Date(l.created_at).toLocaleString() },
              ]}
              data={provLogs}
            />
          )}
        </div>
      </div>
    </PageTransition>
  )
}
