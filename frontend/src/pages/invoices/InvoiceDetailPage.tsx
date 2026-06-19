import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getInvoice, sendInvoice } from "@/services/invoices"
import { initiateStkPush } from "@/services/mpesa"
import { PdfViewer } from "@/components/shared/PdfViewer"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Download, Send, Smartphone } from "lucide-react"
import { PageTransition } from "@/components/shared/PageTransition"
import { CardSkeleton } from "@/components/ui/Skeleton"
import { EmptyState } from "@/components/ui/EmptyState"
import { useToast } from "@/components/ui/Toaster"

export function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [mpesaOpen, setMpesaOpen] = useState(false)
  const [mpesaPhone, setMpesaPhone] = useState("")

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => getInvoice(id!),
    enabled: !!id,
  })

  const sendMut = useMutation({
    mutationFn: () => sendInvoice(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", id] })
      toast("success", "Invoice sent", "The invoice has been emailed successfully.")
    },
    onError: () => toast("error", "Failed to send invoice"),
  })

  const mpesaMut = useMutation({
    mutationFn: () => initiateStkPush({
      customer_id: invoice!.customer_id,
      amount: invoice!.balance_due,
      phone: mpesaPhone,
      invoice_id: id!,
    }),
    onSuccess: () => {
      setMpesaOpen(false)
      setMpesaPhone("")
      toast("success", "STK Push sent", "Payment request has been sent to the customer's phone.")
    },
    onError: () => toast("error", "STK Push failed", "Could not send the payment request."),
  })

  if (isLoading) return (
    <PageTransition>
      <CardSkeleton count={2} />
    </PageTransition>
  )
  if (!invoice) return (
    <PageTransition>
      <EmptyState
        title="Invoice not found"
        description="The invoice you're looking for doesn't exist or has been removed."
      />
    </PageTransition>
  )

  return (
    <PageTransition>
      <PageHeader
        title={`Invoice ${invoice.invoice_number}`}
        actions={
          <div className="flex gap-2">
            {invoice.status !== "paid" && (
              <>
                <Button variant="outline" size="sm" onClick={() => sendMut.mutate()}>
                  <Send className="h-4 w-4 mr-2" />Email
                </Button>
                <Button size="sm" onClick={() => setMpesaOpen(true)}>
                  <Smartphone className="h-4 w-4 mr-2" />M-Pesa Pay
                </Button>
              </>
            )}
            <PdfViewer invoiceId={id!} invoiceNumber={invoice.invoice_number}>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />PDF
              </Button>
            </PdfViewer>
            <Button variant="outline" onClick={() => navigate("/invoices")}>
              <ArrowLeft className="h-4 w-4 mr-2" />Back
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Invoice Items</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left pb-2">Description</th>
                  <th className="text-right pb-2">Qty</th>
                  <th className="text-right pb-2">Unit Price</th>
                  <th className="text-right pb-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2">{item.description}</td>
                    <td className="text-right py-2">{item.quantity}</td>
                    <td className="text-right py-2">KES {item.unit_price.toLocaleString()}</td>
                    <td className="text-right py-2">KES {item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={3} className="text-right pt-4 font-medium">Subtotal</td><td className="text-right pt-4">KES {invoice.subtotal.toLocaleString()}</td></tr>
                <tr><td colSpan={3} className="text-right">VAT (16%)</td><td className="text-right">KES {invoice.vat_amount.toLocaleString()}</td></tr>
                <tr className="font-bold text-lg"><td colSpan={3} className="text-right">Total</td><td className="text-right">KES {invoice.total.toLocaleString()}</td></tr>
                <tr><td colSpan={3} className="text-right">Balance Due</td><td className="text-right">KES {invoice.balance_due.toLocaleString()}</td></tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Status</span>
              <div className="mt-1"><StatusBadge status={invoice.status} /></div>
            </div>
            <div>
              <span className="text-muted-foreground">Issue Date</span>
              <div>{invoice.issue_date}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Due Date</span>
              <div>{invoice.due_date}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Invoice #</span>
              <div>{invoice.invoice_number}</div>
            </div>
            {invoice.notes && (
              <div>
                <span className="text-muted-foreground">Notes</span>
                <div className="mt-1 text-xs bg-muted p-2 rounded">{invoice.notes}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
    </PageTransition>
  )
}
