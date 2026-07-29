import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  listMpesaTransactions,
  initiateStkPush,
  reconcileTransactions,
  getMpesaSummary,
  queryTransaction,
  type MpesaTransaction,
} from "@/services/mpesa"
import { listCustomers, type Customer } from "@/services/customers"
import { listInvoices, type Invoice } from "@/services/invoices"
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
import { Phone, Send, RefreshCw, DollarSign, TrendingUp, Clock, CheckCircle2, XCircle, Loader2, Bell } from "lucide-react"
import { useToast } from "@/components/ui/Toaster"

type StkStage = "form" | "sending" | "waiting" | "success" | "failed" | "cancelled"

const POLL_INITIAL_MS = 2000
const POLL_MAX_MS = 30000
const POLL_BACKOFF = 1.8

export function MpesaPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [showStkDialog, setShowStkDialog] = useState(false)

  const { data: listResponse, isLoading } = useQuery({
    queryKey: ["mpesa", search, statusFilter],
    queryFn: () =>
      listMpesaTransactions({
        search: search || undefined,
        status: statusFilter || undefined,
      }),
  })

  const transactions = listResponse?.transactions ?? []
  const totalCount = listResponse?.total ?? 0

  const { data: summary } = useQuery({
    queryKey: ["mpesa-summary"],
    queryFn: getMpesaSummary,
    refetchInterval: 60000,
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
        description={`${totalCount} Safaricom Daraja API transactions`}
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
            { value: "cancelled", label: "Cancelled" },
          ]}
          className="max-w-[200px]"
        />
      </div>

      {!isLoading && transactions.length === 0 ? (
        <EmptyState
          icon={<Phone className="h-12 w-12" />}
          title="No M-Pesa transactions yet"
          description="Transactions will appear here when customers pay or when you send STK Push requests"
        />
      ) : (
        <DataTable columns={columns} data={transactions} loading={isLoading} pageSize={25} minWidth="600px" />
      )}

      {/* STK Push Dialog */}
      <StkPushDialog
        open={showStkDialog}
        onOpenChange={setShowStkDialog}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["mpesa"] })
          queryClient.invalidateQueries({ queryKey: ["mpesa-summary"] })
        }}
      />
    </PageTransition>
  )
}

// ─── STK Push Dialog ──────────────────────────────────────────────────────────

function StkPushDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const { toast } = useToast()

  // Form state
  const [customerSearch, setCustomerSearch] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [amount, setAmount] = useState("")
  const [phone, setPhone] = useState("")

  // Polling state — lives in the dialog but survives close
  const [stage, setStage] = useState<StkStage>("form")
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null)
  const [pollCount, setPollCount] = useState(0)
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [backgroundPolling, setBackgroundPolling] = useState(false)

  // Ref to latest stage/checkoutRequestId for the polling callback
  const pollStateRef = useRef({ stage, checkoutRequestId, pollCount })
  pollStateRef.current = { stage, checkoutRequestId, pollCount }

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-all"],
    queryFn: () => listCustomers({ limit: 500 }),
    enabled: open,
  })

  // Filter customers by search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 50)
    const q = customerSearch.toLowerCase()
    return customers
      .filter(
        (c) =>
          c.first_name.toLowerCase().includes(q) ||
          c.last_name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.email?.toLowerCase().includes(q)
      )
      .slice(0, 50)
  }, [customers, customerSearch])

  // Fetch invoices for selected customer
  const { data: customerInvoices = [] } = useQuery({
    queryKey: ["invoices-customer", selectedCustomer?.id],
    queryFn: () => listInvoices({ customer_id: selectedCustomer!.id, limit: 100 }),
    enabled: !!selectedCustomer,
  })

  // Only show unpaid/overdue invoices
  const unpaidInvoices = useMemo(
    () => customerInvoices.filter((inv) => ["sent", "overdue", "partially_paid"].includes(inv.status)),
    [customerInvoices]
  )

  // Auto-fill phone from customer
  useEffect(() => {
    if (selectedCustomer) {
      setPhone(selectedCustomer.mpesa_phone || selectedCustomer.phone || "")
    }
  }, [selectedCustomer])

  // Auto-fill amount from invoice
  useEffect(() => {
    if (selectedInvoice) {
      setAmount(selectedInvoice.balance_due.toString())
    }
  }, [selectedInvoice])

  // STK Push mutation
  const stkMutation = useMutation({
    mutationFn: initiateStkPush,
    onSuccess: (data) => {
      setCheckoutRequestId(data.checkout_request_id)
      setStage("waiting")
      setPollCount(0)
      setBackgroundPolling(false)
    },
    onError: (error: any) => {
      toast("error", error?.response?.data?.detail || "Failed to send STK Push")
      setStage("form")
    },
  })

  // ── Polling with exponential backoff ──
  const doPoll = useCallback(() => {
    const current = pollStateRef.current
    if (current.stage !== "waiting" || !current.checkoutRequestId) return

    const nextCount = current.pollCount + 1
    setPollCount(nextCount)

    queryTransaction(current.checkoutRequestId)
      .then((result) => {
        const status = result?.status
        if (status === "completed") {
          setStage("success")
          setReceiptNumber(result.receipt_number || null)
          onSuccess()
          // If closed, notify via toast
          if (pollStateRef.current.stage === "waiting" && !open) {
            const receipt = result.receipt_number || ""
            toast("success", `Payment confirmed! Receipt: ${receipt}`)
          }
          return
        }
        if (status === "cancelled") {
          setStage("cancelled")
          if (!open) toast("info", "STK Push was cancelled by the customer")
          return
        }
        if (status === "failed") {
          setStage("failed")
          if (!open) toast("error", "STK Push payment failed")
          return
        }
        // Still pending — schedule next poll with backoff
        scheduleNext(nextCount)
      })
      .catch(() => {
        // Network error — retry with backoff
        scheduleNext(nextCount)
      })
  }, [onSuccess, open, toast])

  const scheduleNext = useCallback(
    (count: number) => {
      const delay = Math.min(POLL_INITIAL_MS * Math.pow(POLL_BACKOFF, count - 1), POLL_MAX_MS)
      pollIntervalRef.current = setTimeout(doPoll, delay)
    },
    [doPoll]
  )

  // Start polling when stage transitions to "waiting"
  useEffect(() => {
    if (stage === "waiting" && checkoutRequestId) {
      // First poll happens immediately (the Daraja callback may have already arrived)
      pollIntervalRef.current = setTimeout(doPoll, 500)
    }
    return () => {
      if (pollIntervalRef.current) clearTimeout(pollIntervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, checkoutRequestId])

  const handleSend = () => {
    if (!selectedCustomer) {
      toast("error", "Please select a customer")
      return
    }
    if (!phone) {
      toast("error", "Please enter a phone number")
      return
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast("error", "Please enter a valid amount")
      return
    }
    setStage("sending")
    stkMutation.mutate({
      customer_id: selectedCustomer.id,
      phone,
      amount: parseFloat(amount),
      invoice_id: selectedInvoice?.id || undefined,
    })
  }

  const handleClose = () => {
    // If we're actively waiting, move to background polling
    if (stage === "waiting") {
      setBackgroundPolling(true)
      setStage("form") // Reset dialog UI for reuse
      toast("info", "STK Push is still pending. You'll be notified when it completes.")
      onOpenChange(false)
      return
    }
    // Otherwise full reset
    resetForm()
    if (pollIntervalRef.current) clearTimeout(pollIntervalRef.current)
    onOpenChange(false)
  }

  const resetForm = () => {
    setCustomerSearch("")
    setSelectedCustomer(null)
    setSelectedInvoice(null)
    setAmount("")
    setPhone("")
    setStage("form")
    setCheckoutRequestId(null)
    setPollCount(0)
    setReceiptNumber(null)
    setBackgroundPolling(false)
  }

  const handleDialogClose = () => {
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Send STK Push
            {backgroundPolling && (
              <span className="ml-2 inline-flex items-center text-xs text-amber-500">
                <Bell className="h-3 w-3 mr-1" />
                Background poll active
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* ── Form Stage ── */}
        {(stage === "form" || stage === "sending") && (
          <div className="space-y-4 py-4">
            {/* Customer Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer</label>
              {selectedCustomer ? (
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">
                      {selectedCustomer.first_name} {selectedCustomer.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{selectedCustomer.phone}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Search by name, phone, or email..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
                    {filteredCustomers.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground">No customers found</p>
                    ) : (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-muted/50 border-b border-border last:border-0 transition-colors"
                          onClick={() => {
                            setSelectedCustomer(c)
                            setCustomerSearch("")
                          }}
                        >
                          <p className="text-sm font-medium">
                            {c.first_name} {c.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.phone}
                            {c.email ? ` · ${c.email}` : ""}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label htmlFor="stk-phone" className="text-sm font-medium">
                Phone Number
              </label>
              <Input
                id="stk-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712345678"
              />
              <p className="text-xs text-muted-foreground">Will be normalized to 254... format</p>
            </div>

            {/* Invoice Selector */}
            {selectedCustomer && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Invoice (optional)</label>
                {unpaidInvoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No unpaid invoices for this customer</p>
                ) : (
                  <Select
                    value={selectedInvoice?.id || ""}
                    onChange={(e) => {
                      const inv = unpaidInvoices.find((i) => i.id === e.target.value)
                      setSelectedInvoice(inv || null)
                    }}
                    options={[
                      { value: "", label: "No invoice — general payment" },
                      ...unpaidInvoices.map((inv) => ({
                        value: inv.id,
                        label: `${inv.invoice_number} — KES ${inv.balance_due.toLocaleString()} (${inv.status})`,
                      })),
                    ]}
                  />
                )}
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <label htmlFor="stk-amount" className="text-sm font-medium">
                Amount (KES)
              </label>
              <Input
                id="stk-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000"
                min={1}
                max={150000}
              />
            </div>
          </div>
        )}

        {/* ── Waiting Stage (polling) ── */}
        {stage === "waiting" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-lg font-medium">Waiting for customer to confirm...</p>
              <p className="text-sm text-muted-foreground mt-1">
                An M-Pesa prompt has been sent to <strong>{phone}</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Polling with backoff · {pollCount} attempts
              </p>
            </div>
          </div>
        )}

        {/* ── Success Stage ── */}
        {stage === "success" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div className="text-center">
              <p className="text-lg font-medium text-green-600">Payment Confirmed!</p>
              <p className="text-sm text-muted-foreground mt-1">
                KES {parseFloat(amount || "0").toLocaleString()} received
              </p>
              {receiptNumber && (
                <p className="text-sm text-muted-foreground mt-1">Receipt: {receiptNumber}</p>
              )}
              {selectedInvoice && (
                <p className="text-sm text-muted-foreground mt-1">
                  Applied to {selectedInvoice.invoice_number}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Failed Stage ── */}
        {stage === "failed" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <XCircle className="h-12 w-12 text-destructive" />
            <div className="text-center">
              <p className="text-lg font-medium text-destructive">Payment Failed</p>
              <p className="text-sm text-muted-foreground mt-1">
                The transaction could not be completed. The customer may have insufficient funds or the
                request timed out on Safaricom's side.
              </p>
            </div>
          </div>
        )}

        {/* ── Cancelled Stage ── */}
        {stage === "cancelled" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <XCircle className="h-12 w-12 text-yellow-500" />
            <div className="text-center">
              <p className="text-lg font-medium text-yellow-600">Payment Cancelled</p>
              <p className="text-sm text-muted-foreground mt-1">
                The customer declined or cancelled the STK Push prompt on their phone.
              </p>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <DialogFooter>
          {(stage === "form" || stage === "sending") && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSend} disabled={stkMutation.isPending || stage === "sending"}>
                {stage === "sending" ? "Sending..." : "Send STK Push"}
              </Button>
            </>
          )}
          {stage === "waiting" && (
            <Button variant="outline" onClick={handleClose}>
              Close (background polling continues)
            </Button>
          )}
          {(stage === "success" || stage === "failed" || stage === "cancelled") && (
            <Button onClick={() => { resetForm(); onOpenChange(false) }}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
