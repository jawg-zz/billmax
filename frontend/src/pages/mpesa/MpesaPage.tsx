import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  listMpesaTransactions,
  initiateStkPush,
  reconcileTransactions,
  getMpesaSummary,
  type MpesaTransaction,
} from "@/services/mpesa"
import { PageHeader } from "@/components/shared/PageHeader"
import { PageTransition } from "@/components/shared/PageTransition"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/ui/EmptyState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select } from "@/components/ui/select"
import { Phone, Send, RefreshCw, DollarSign, TrendingUp, Clock } from "lucide-react"
import { useToast } from "@/components/ui/Toaster"

export function MpesaPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [showStkDialog, setShowStkDialog] = useState(false)
  const [stkForm, setStkForm] = useState({
    customer_id: "",
    phone: "",
    amount: "",
    invoice_id: "",
  })

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["mpesa", search, statusFilter],
    queryFn: () =>
      listMpesaTransactions({
        search: search || undefined,
        status: statusFilter || undefined,
      }),
  })

  const { data: summary } = useQuery({
    queryKey: ["mpesa-summary"],
    queryFn: getMpesaSummary,
    refetchInterval: 60000, // Refresh every minute
  })

  const stkMutation = useMutation({
    mutationFn: initiateStkPush,
    onSuccess: () => {
      toast("success", "STK Push sent successfully")
      setShowStkDialog(false)
      setStkForm({ customer_id: "", phone: "", amount: "", invoice_id: "" })
      queryClient.invalidateQueries({ queryKey: ["mpesa"] })
    },
    onError: (error: any) => {
      toast("error", error?.response?.data?.detail || "Failed to send STK Push")
    },
  })

  const reconcileMutation = useMutation({
    mutationFn: reconcileTransactions,
    onSuccess: (data) => {
      toast("success", `Reconciled ${data.processed} transactions`)
      queryClient.invalidateQueries({ queryKey: ["mpesa"] })
      queryClient.invalidateQueries({ queryKey: ["mpesa-summary"] })
    },
    onError: (error: any) => {
      toast("error", error?.response?.data?.detail || "Failed to reconcile transactions")
    },
  })

  const handleStkSubmit = () => {
    if (!stkForm.customer_id || !stkForm.phone || !stkForm.amount) {
      toast("error", "Please fill in all required fields")
      return
    }
    stkMutation.mutate({
      customer_id: stkForm.customer_id,
      phone: stkForm.phone,
      amount: parseFloat(stkForm.amount),
      invoice_id: stkForm.invoice_id || undefined,
    })
  }

  const columns: Column<MpesaTransaction>[] = [
    { key: "type", header: "Type", sortable: true },
    { key: "phone", header: "Phone", sortable: true },
    {
      key: "amount",
      header: "Amount (KES)",
      sortable: true,
      sortValue: (t) => t.amount,
      cell: (t) => <span className="font-medium tabular-nums">KES {t.amount.toLocaleString()}</span>,
    },
    {
      key: "receipt",
      header: "Receipt",
      cell: (t) => t.receipt ?? <span className="text-muted-foreground">—</span>,
    },
    { key: "status", header: "Status", sortable: true, cell: (t) => <StatusBadge status={t.status} /> },
    {
      key: "created_at",
      header: "Date",
      sortable: true,
      sortValue: (t) => t.created_at,
      cell: (t) => new Date(t.created_at).toLocaleDateString(),
    },
  ]

  return (
    <PageTransition>
      <PageHeader
        title="M-Pesa Transactions"
        description={`${transactions?.length ?? 0} Safaricom Daraja API transactions`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => reconcileMutation.mutate()}
              disabled={reconcileMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${reconcileMutation.isPending ? "animate-spin" : ""}`} />
              Reconcile
            </Button>
            <Button onClick={() => setShowStkDialog(true)}>
              <Send className="h-4 w-4 mr-2" />
              STK Push
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Collections</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {summary?.today?.total?.toLocaleString() ?? "0"}</div>
            <p className="text-xs text-muted-foreground">{summary?.today?.count ?? 0} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">KES {summary?.week?.total?.toLocaleString() ?? "0"}</div>
            <p className="text-xs text-muted-foreground">{summary?.week?.count ?? 0} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.pending ?? 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <Input
          placeholder="Search by phone, receipt, or reference..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: "All statuses" },
            { value: "pending", label: "Pending" },
            { value: "completed", label: "Completed" },
            { value: "failed", label: "Failed" },
          ]}
          className="max-w-[200px]"
        />
      </div>

      {!isLoading && (transactions ?? []).length === 0 ? (
        <EmptyState
          icon={<Phone className="h-12 w-12" />}
          title="No M-Pesa transactions yet"
          description="Transactions will appear here when customers pay or when you send STK Push requests"
        />
      ) : (
        <DataTable columns={columns} data={transactions ?? []} loading={isLoading} pageSize={25} minWidth="600px" />
      )}

      {/* STK Push Dialog */}
      <Dialog open={showStkDialog} onOpenChange={setShowStkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send STK Push</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="customer_id" className="text-sm font-medium">
                Customer ID
              </label>
              <Input
                id="customer_id"
                value={stkForm.customer_id}
                onChange={(e) => setStkForm({ ...stkForm, customer_id: e.target.value })}
                placeholder="Enter customer UUID"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                Phone Number
              </label>
              <Input
                id="phone"
                value={stkForm.phone}
                onChange={(e) => setStkForm({ ...stkForm, phone: e.target.value })}
                placeholder="0712345678"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-medium">
                Amount (KES)
              </label>
              <Input
                id="amount"
                type="number"
                value={stkForm.amount}
                onChange={(e) => setStkForm({ ...stkForm, amount: e.target.value })}
                placeholder="1000"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="invoice_id" className="text-sm font-medium">
                Invoice ID (Optional)
              </label>
              <Input
                id="invoice_id"
                value={stkForm.invoice_id}
                onChange={(e) => setStkForm({ ...stkForm, invoice_id: e.target.value })}
                placeholder="Invoice UUID"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStkSubmit} disabled={stkMutation.isPending}>
              {stkMutation.isPending ? "Sending..." : "Send STK Push"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
