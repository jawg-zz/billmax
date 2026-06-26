import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { listInvoices, sendInvoice, recordPayment, type Invoice } from "@/services/invoices"
import { listCustomers } from "@/services/customers"
import { initiateStkPush } from "@/services/mpesa"
import { PdfViewer } from "@/components/shared/PdfViewer"
import { PageHeader } from "@/components/shared/PageHeader"
import { PageTransition } from "@/components/shared/PageTransition"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/ui/FormField"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/Toaster"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Check, Eye, Loader2, Send, CreditCard, Download, Smartphone, Receipt } from "lucide-react"
import { useState } from "react"

function InvoiceActions({ invoice }: { invoice: Invoice }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [payOpen, setPayOpen] = useState(false)
  const [mpesaOpen, setMpesaOpen] = useState(false)
  const [mpesaPhone, setMpesaPhone] = useState("")
  const [amount, setAmount] = useState(invoice.balance_due)
  const [payMethod, setPayMethod] = useState("mpesa")
  const [mpesaStatus, setMpesaStatus] = useState<"idle" | "sending" | "success" | "error">("idle")
  const [mpesaError, setMpesaError] = useState("")

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["invoices"] })

  const sendMut = useMutation({
    mutationFn: () => sendInvoice(invoice.id),
    onSuccess: () => { invalidate(); toast("success", "Invoice sent") },
    onError: (err: any) => toast("error", err?.response?.data?.detail || "Failed to send invoice"),
  })
  const payMut = useMutation({
    mutationFn: () => recordPayment(invoice.id, { amount, payment_method: payMethod }),
    onSuccess: () => { invalidate(); setPayOpen(false); toast("success", "Payment recorded") },
    onError: (err: any) => toast("error", err?.response?.data?.detail || "Failed to record payment"),
  })
  const mpesaMut = useMutation({
    mutationFn: () => initiateStkPush({ customer_id: invoice.customer_id, amount: invoice.balance_due, phone: mpesaPhone, invoice_id: invoice.id }),
    onSuccess: () => { setMpesaStatus("success"); setMpesaPhone(""); toast("success", "STK Push sent") },
    onError: (error: unknown) => { setMpesaStatus("error"); setMpesaError(error instanceof Error ? error.message : "Failed to send STK Push"); toast("error", "Failed to send STK Push") },
  })

  return (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" title="View" onClick={() => navigate(`/invoices/${invoice.id}`)}>
        <Eye className="h-4 w-4" />
      </Button>
      <PdfViewer invoiceId={invoice.id} invoiceNumber={invoice.invoice_number}>
        <Button variant="ghost" size="icon" title="View PDF">
          <Download className="h-4 w-4" />
        </Button>
      </PdfViewer>
      {invoice.balance_due > 0 && invoice.status !== "paid" && (
        <>
          <Button variant="ghost" size="icon" title="Email Invoice" onClick={() => sendMut.mutate()}>
            <Send className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="M-Pesa STK Push" onClick={() => setMpesaOpen(true)}>
            <Smartphone className="h-4 w-4 text-green-600" />
          </Button>
          <Dialog open={payOpen} onOpenChange={setPayOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Record Payment"><CreditCard className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Payment — {invoice.invoice_number}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); payMut.mutate() }} className="space-y-4">
                <FormField label="Amount (KES)" required>
                  <Input type="number" value={amount} onChange={(e) => setAmount(+e.target.value)} min={1} />
                </FormField>
                <FormField label="Payment Method" required>
                  <Select options={[
                    { value: "mpesa", label: "M-Pesa" },
                    { value: "bank_transfer", label: "Bank Transfer" },
                    { value: "cash", label: "Cash" },
                  ]} value={payMethod} onChange={(e) => setPayMethod(e.target.value)} />
                </FormField>
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={payMut.isPending}>Record Payment</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}

      <Dialog open={mpesaOpen} onOpenChange={(open) => { setMpesaOpen(open); if (!open) { setMpesaStatus("idle"); setMpesaError("") } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="bg-emerald-600 -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
            <DialogTitle>
              <div className="flex items-center gap-2 text-white">
                <Smartphone className="h-5 w-5" />
                M-Pesa Payment Request
              </div>
            </DialogTitle>
          </DialogHeader>

          {mpesaStatus === "success" ? (
            <div className="flex flex-col items-center py-6 space-y-4">
              <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Check className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold">Payment request sent!</h3>
              <p className="text-sm text-muted-foreground text-center">
                Ask the customer to check their phone and enter M-Pesa PIN to complete payment.
              </p>
              <Button onClick={() => { setMpesaOpen(false); setMpesaStatus("idle") }} className="w-full">
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setMpesaStatus("sending"); mpesaMut.mutate() }} className="space-y-5">
              <div className="bg-muted/50 border border-emerald-200 dark:border-emerald-900 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Amount Due</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  KES {invoice.balance_due.toLocaleString()}
                </p>
              </div>

              {mpesaStatus === "error" && mpesaError && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
                  {mpesaError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Customer M-Pesa Phone</label>
                <Input
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  placeholder="e.g. 0712345678"
                  required
                  className="focus-visible:ring-emerald-500"
                />
                <p className="text-xs text-muted-foreground">
                  Customer will receive the payment request on this number
                </p>
                <p className="text-xs text-muted-foreground">
                  We accept 0712..., +2547..., 2547...
                </p>
              </div>

              <Button type="submit" disabled={mpesaMut.isPending || !mpesaPhone} className="w-full bg-emerald-600 hover:bg-emerald-700">
                {mpesaMut.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending M-Pesa request...
                  </>
                ) : "Send STK Push"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function InvoiceListPage() {
  const navigate = useNavigate()
  const { data: invoices, isLoading } = useQuery({ queryKey: ["invoices"], queryFn: () => listInvoices() })
  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: () => listCustomers() })
  const custMap = new Map(customers?.map((c) => [c.id, c]))

  const columns: Column<Invoice>[] = [
    { key: "invoice_number", header: "Invoice #", sortable: true },
    {
      key: "customer", header: "Customer", sortable: true, hideOnMobile: true,
      sortValue: (i) => { const c = custMap.get(i.customer_id); return c ? `${c.first_name} ${c.last_name}` : "" },
      cell: (i) => {
        const c = custMap.get(i.customer_id)
        return c ? (
          <button className="text-primary hover:underline font-medium" onClick={() => navigate(`/customers/${c.id}`)}>
            {c.first_name} {c.last_name}
          </button>
        ) : <span className="text-muted-foreground text-xs">{i.customer_id.slice(0, 8)}</span>
      },
    },
    { key: "total", header: "Total (KES)", sortable: true, sortValue: (i) => i.total, className: "tabular-nums", cell: (i) => i.total.toLocaleString() },
    { key: "balance_due", header: "Balance", sortable: true, sortValue: (i) => i.balance_due, className: "tabular-nums", cell: (i) => i.balance_due.toLocaleString() },
    { key: "due_date", header: "Due Date", sortable: true },
    { key: "status", header: "Status", sortable: true, cell: (i) => <StatusBadge status={i.status} /> },
    { key: "actions", header: "", cell: (i) => <InvoiceActions invoice={i} /> },
  ]

  return (
    <PageTransition>
      <PageHeader title="Invoices" description={`${invoices?.length ?? 0} billing records`} />

      {!isLoading && (invoices ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
          <Receipt className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">No invoices yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">Invoices are generated automatically when billing runs</p>
        </div>
      ) : (
        <DataTable columns={columns} data={invoices ?? []} loading={isLoading} pageSize={25} minWidth="700px" />
      )}
    </PageTransition>
  )
}
