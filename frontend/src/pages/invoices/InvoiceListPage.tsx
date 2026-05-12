import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { listInvoices, sendInvoice, recordPayment, downloadPdf, type Invoice } from "@/services/invoices"
import { initiateStkPush } from "@/services/mpesa"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Eye, Send, CreditCard, Download, Smartphone } from "lucide-react"
import { useState } from "react"

function InvoiceActions({ invoice }: { invoice: Invoice }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [payOpen, setPayOpen] = useState(false)
  const [mpesaOpen, setMpesaOpen] = useState(false)
  const [mpesaPhone, setMpesaPhone] = useState("")
  const [amount, setAmount] = useState(invoice.balance_due)
  const [payMethod, setPayMethod] = useState("mpesa")

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["invoices"] })

  const sendMut = useMutation({ mutationFn: () => sendInvoice(invoice.id), onSuccess: invalidate })
  const payMut = useMutation({
    mutationFn: () => recordPayment(invoice.id, { amount, payment_method: payMethod }),
    onSuccess: () => { invalidate(); setPayOpen(false) },
  })
  const mpesaMut = useMutation({
    mutationFn: () => initiateStkPush({ customer_id: invoice.customer_id, amount: invoice.balance_due, phone: mpesaPhone, invoice_id: invoice.id }),
    onSuccess: () => { setMpesaOpen(false); setMpesaPhone("") },
  })

  return (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" title="View" onClick={() => navigate(`/invoices/${invoice.id}`)}>
        <Eye className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" title="Download PDF" onClick={() => downloadPdf(invoice.id)}>
        <Download className="h-4 w-4" />
      </Button>
      {invoice.status !== "paid" && (
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
              <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); payMut.mutate() }} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount (KES)</label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(+e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Method</label>
                  <Select options={[
                    { value: "mpesa", label: "M-Pesa" },
                    { value: "bank_transfer", label: "Bank Transfer" },
                    { value: "cash", label: "Cash" },
                  ]} value={payMethod} onChange={(e) => setPayMethod(e.target.value)} />
                </div>
                <Button type="submit" disabled={payMut.isPending}>Record Payment</Button>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}

      <Dialog open={mpesaOpen} onOpenChange={setMpesaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>M-Pesa STK Push</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); mpesaMut.mutate() }} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send payment request of <strong>KES {invoice.balance_due.toLocaleString()}</strong> to customer's phone.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer M-Pesa Phone</label>
              <Input value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} placeholder="2547XXXXXXXX" required />
            </div>
            <Button type="submit" disabled={mpesaMut.isPending || !mpesaPhone}>
              {mpesaMut.isPending ? "Sending..." : "Send STK Push"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const columns: Column<Invoice>[] = [
  { key: "invoice_number", header: "Invoice #" },
  { key: "customer_id", header: "Customer" },
  { key: "total", header: "Total (KES)", cell: (i) => i.total.toLocaleString() },
  { key: "balance_due", header: "Balance", cell: (i) => i.balance_due.toLocaleString() },
  { key: "due_date", header: "Due Date" },
  { key: "status", header: "Status", cell: (i) => <StatusBadge status={i.status} /> },
  { key: "actions", header: "", cell: (i) => <InvoiceActions invoice={i} /> },
]

export function InvoiceListPage() {
  const { data, isLoading } = useQuery({ queryKey: ["invoices"], queryFn: () => listInvoices() })

  return (
    <div>
      <PageHeader title="Invoices" description="Customer billing records" />
      <DataTable columns={columns} data={data ?? []} loading={isLoading} />
    </div>
  )
}
