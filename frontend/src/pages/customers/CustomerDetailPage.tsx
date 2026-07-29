import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getCustomer, updateCustomer } from "@/services/customers"
import { listInvoices, type Invoice } from "@/services/invoices"
import { listSubscriptions, type Subscription } from "@/services/subscriptions"
import { listTickets } from "@/services/tickets"
import { listMpesaTransactions, type MpesaTransaction } from "@/services/mpesa"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { ArrowLeft, Mail, Phone, MapPin, CreditCard, UserCheck, Pencil, Calendar } from "lucide-react"
import { PageTransition } from "@/components/shared/PageTransition"
import { CardSkeleton } from "@/components/ui/Skeleton"
import { EmptyState } from "@/components/ui/EmptyState"
import { useToast } from "@/components/ui/Toaster"

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

const mpesaCols: Column<MpesaTransaction>[] = [
  { key: "type", header: "Type" },
  { key: "amount", header: "Amount", cell: (t) => `KES ${t.amount.toLocaleString()}` },
  { key: "receipt", header: "Receipt", cell: (t) => t.receipt ?? "—" },
  { key: "status", header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
  { key: "created_at", header: "Date", cell: (t) => new Date(t.created_at).toLocaleDateString() },
]

export function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const statusMut = useMutation({
    mutationFn: (status: string) => updateCustomer(id!, { status }),
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] })
      toast("success", "Status updated", `Customer status changed to ${status}`)
    },
    onError: (err: any) => toast("error", err?.response?.data?.detail || "Failed to update status"),
  })

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

  const { data: mpesaResp } = useQuery({
    queryKey: ["mpesa", "customer", id],
    queryFn: () => listMpesaTransactions(),
    enabled: !!id,
  })
  const mpesaTx = mpesaResp?.transactions ?? []

  if (isLoading) return (
    <PageTransition>
      <CardSkeleton count={6} />
    </PageTransition>
  )
  if (!customer) return (
    <PageTransition>
      <EmptyState
        title="Customer not found"
        description="The customer you're looking for doesn't exist or has been removed."
      />
    </PageTransition>
  )

  const customerSubs = subscriptions?.filter((s) => s.customer_id === id) ?? []
  const customerTickets = tickets ?? []
  const customerMpesa = mpesaTx.filter((t) => t.phone.includes(customer.phone.slice(-9)))

  return (
    <PageTransition>
      <PageHeader
        title={`${customer.first_name} ${customer.last_name}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(`/customers/${id}/edit`)}>
              <Pencil className="h-4 w-4 mr-2" />Edit
            </Button>
            <Button variant="outline" onClick={() => navigate("/customers")}>
              <ArrowLeft className="h-4 w-4 mr-2" />Back
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6">
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
              <Phone className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm font-medium truncate">{customer.phone}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium truncate">{customer.email || "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
              <CreditCard className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs text-muted-foreground">KRA PIN</p>
              <p className="text-sm font-medium truncate">{customer.kra_pin || "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
                <UserCheck className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <p className="text-xs text-muted-foreground">Status</p>
              </div>
            </div>
            <Select
              options={[
                { value: "active", label: "Active" },
                { value: "suspended", label: "Suspended" },
                { value: "terminated", label: "Terminated" },
              ]}
              value={customer.status}
              onChange={(e) => statusMut.mutate(e.target.value)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs text-muted-foreground">M-Pesa Phone</p>
              <p className="text-sm font-medium truncate">{customer.mpesa_phone || "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs text-muted-foreground">ID Number</p>
              <p className="text-sm font-medium truncate">{customer.id_number || "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {customer.notes && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{customer.notes}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {customer.physical_address && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Physical Address
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">{customer.physical_address}</CardContent>
          </Card>
        )}
        {customer.service_address && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Service Address
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">{customer.service_address}</CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span>Subscriptions</span>
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground normal-case tracking-normal">{customerSubs.length}</span>
            </h3>
          </CardHeader>
          <CardContent>
            {customerSubs.length === 0 ? (
              <EmptyState title="No subscriptions" description="This customer has no subscriptions." />
            ) : (
              <DataTable columns={subCols} data={customerSubs} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span>Invoices</span>
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground normal-case tracking-normal">{invoices?.length ?? 0}</span>
            </h3>
          </CardHeader>
          <CardContent>
            {!invoices || invoices.length === 0 ? (
              <EmptyState title="No invoices" description="This customer has no invoices." />
            ) : (
              <DataTable columns={invoiceCols} data={invoices} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span>M-Pesa Transactions</span>
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground normal-case tracking-normal">{customerMpesa.length}</span>
            </h3>
          </CardHeader>
          <CardContent>
            {customerMpesa.length === 0 ? (
              <EmptyState title="No M-Pesa transactions" description="This customer has no M-Pesa transactions." />
            ) : (
              <DataTable columns={mpesaCols} data={customerMpesa} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span>Tickets</span>
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground normal-case tracking-normal">{customerTickets.length}</span>
            </h3>
          </CardHeader>
          <CardContent>
            {customerTickets.length === 0 ? (
              <EmptyState title="No tickets" description="This customer has no tickets." />
            ) : (
              <DataTable
                columns={[
                  { key: "subject", header: "Subject" },
                  { key: "priority", header: "Priority", cell: (t) => <StatusBadge status={t.priority} /> },
                  { key: "status", header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
                ]}
                data={customerTickets}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  )
}
