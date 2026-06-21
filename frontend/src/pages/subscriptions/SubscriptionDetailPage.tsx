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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate("/subscriptions")}>
              <ArrowLeft className="h-4 w-4 mr-2" />Back
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs text-muted-foreground">Customer</p>
              <p className="text-sm font-medium truncate">
                {customer ? `${customer.first_name} ${customer.last_name}` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">{customer?.phone}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
              <Radio className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="text-sm font-medium truncate">{plan?.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{plan?.download_speed_mbps}/{plan?.upload_speed_mbps} Mbps — KES {plan?.price.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
              <Wifi className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs text-muted-foreground">Status</p>
              <StatusBadge status={sub.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
              <Receipt className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs text-muted-foreground">Next Billing</p>
              <p className="text-sm font-medium truncate">{sub.next_billing_date}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="text-sm divide-y divide-border/60">
            <div className="flex justify-between py-2.5 first:pt-0">
              <span className="text-muted-foreground">Provisioned</span>
              <span className="font-medium">{sub.provisioned ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-muted-foreground">Username</span>
              <span className="font-medium">{sub.provisioned_username || "—"}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-muted-foreground">Auto Renew</span>
              <span className="font-medium">{sub.auto_renew ? "Yes" : "No"}</span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-muted-foreground">Start Date</span>
              <span className="font-medium">{new Date(sub.created_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
        {sub.notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{sub.notes}</CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span>Invoices</span>
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground normal-case tracking-normal">{subInvoices.length}</span>
            </h3>
          </CardHeader>
          <CardContent>
            {subInvoices.length === 0 ? (
              <EmptyState title="No invoices" description="This subscription has no invoices yet." />
            ) : (
              <DataTable columns={invoiceCols} data={subInvoices} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span>Provisioning History</span>
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground normal-case tracking-normal">{provLogs?.length ?? 0}</span>
            </h3>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  )
}
