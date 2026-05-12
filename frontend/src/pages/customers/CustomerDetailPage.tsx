import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { getCustomer } from "@/services/customers"
import { listInvoices, type Invoice } from "@/services/invoices"
import { listSubscriptions, type Subscription } from "@/services/subscriptions"
import { listTickets } from "@/services/tickets"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Mail, Phone, MapPin, CreditCard, UserCheck } from "lucide-react"

const invoiceCols: Column<Invoice>[] = [
  { key: "invoice_number", header: "#" },
  { key: "total", header: "Total", cell: (i) => `KES ${i.total.toLocaleString()}` },
  { key: "balance_due", header: "Balance", cell: (i) => `KES ${i.balance_due.toLocaleString()}` },
  { key: "due_date", header: "Due" },
  { key: "status", header: "Status", cell: (i) => <StatusBadge status={i.status} /> },
]

const subCols: Column<Subscription>[] = [
  { key: "plan_id", header: "Plan ID", cell: (s) => s.plan_id.slice(0, 8) },
  { key: "status", header: "Status", cell: (s) => <StatusBadge status={s.status} /> },
  { key: "next_billing_date", header: "Next Billing" },
  { key: "provisioned", header: "Provisioned", cell: (s) => s.provisioned ? "Yes" : "No" },
]

export function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => getCustomer(id!),
    enabled: !!id,
  })

  const { data: invoices } = useQuery({
    queryKey: ["invoices", "customer", id],
    queryFn: () => listInvoices({ customer_id: id }),
    enabled: !!id,
  })

  const { data: subscriptions } = useQuery({
    queryKey: ["subscriptions", "customer", id],
    queryFn: () => listSubscriptions(),
    enabled: !!id,
  })

  const { data: tickets } = useQuery({
    queryKey: ["tickets", "customer", id],
    queryFn: () => listTickets({ customer_id: id }),
    enabled: !!id,
  })

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>
  if (!customer) return <div className="text-center py-12 text-muted-foreground">Customer not found</div>

  const customerSubs = subscriptions?.filter((s) => s.customer_id === id) ?? []
  const customerTickets = tickets ?? []

  return (
    <div>
      <PageHeader
        title={`${customer.first_name} ${customer.last_name}`}
        actions={
          <Button variant="outline" onClick={() => navigate("/customers")}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Phone</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{customer.phone}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Email</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{customer.email || "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">KRA PIN</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{customer.kra_pin || "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent><StatusBadge status={customer.status} /></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {customer.physical_address && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Address</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">{customer.physical_address}</CardContent>
          </Card>
        )}
        {customer.service_address && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Service Address</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">{customer.service_address}</CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Subscriptions ({customerSubs.length})</h2>
          <DataTable columns={subCols} data={customerSubs} emptyMessage="No subscriptions" />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">Invoices ({invoices?.length ?? 0})</h2>
          <DataTable columns={invoiceCols} data={invoices ?? []} emptyMessage="No invoices" />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">Tickets ({customerTickets.length})</h2>
          <DataTable
            columns={[
              { key: "subject", header: "Subject" },
              { key: "priority", header: "Priority", cell: (t) => <StatusBadge status={t.priority} /> },
              { key: "status", header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
            ]}
            data={customerTickets}
            emptyMessage="No tickets"
          />
        </div>
      </div>
    </div>
  )
}
