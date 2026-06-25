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
import { ArrowLeft, Check, Download, Loader2, Send, Smartphone } from "lucide-react"
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
  const [mpesaStatus, setMpesaStatus] = useState<"idle" | "sending" | "success" | "error">("idle")
  const [mpesaError, setMpesaError] = useState("")

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
      setMpesaStatus("success")
      setMpesaPhone("")
      toast("success", "STK Push sent", "Payment request has been sent to the customer's phone.")
    },
    onError: (error: unknown) => {
      setMpesaStatus("error")
      setMpesaError(error instanceof Error ? error.message : "STK Push failed")
      toast("error", "STK Push failed", "Could not send the payment request.")
    },
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
          <div className="flex flex-wrap gap-2">
            {invoice.status !== "paid" && (
              <>
                <Button variant="outline" size="sm" onClick={() => sendMut.mutate()}>
                  <Send className="h-4 w-4 mr-2" />Email
                </Button>
                {invoice.balance_due > 0 && (
                  <Button size="sm" onClick={() => setMpesaOpen(true)}>
                    <Smartphone className="h-4 w-4 mr-2" />M-Pesa Pay
                  </Button>
                )}
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
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                  <th className="text-right px-3 md:px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Qty</th>
                  <th className="text-right px-3 md:px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider tabular-nums">Unit Price</th>
                  <th className="text-right px-3 md:px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider tabular-nums">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-3 md:px-6 py-3">{item.description}</td>
                    <td className="text-right px-3 md:px-6 py-3 tabular-nums">{item.quantity}</td>
                    <td className="text-right px-3 md:px-6 py-3 tabular-nums">KES {item.unit_price.toLocaleString()}</td>
                    <td className="text-right px-3 md:px-6 py-3 tabular-nums font-medium">KES {item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border/60">
                  <td colSpan={3} className="text-right px-3 md:px-6 pt-4 pb-1 text-sm text-muted-foreground">Subtotal</td>
                  <td className="text-right px-3 md:px-6 pt-4 pb-1 text-sm tabular-nums">KES {invoice.subtotal.toLocaleString()}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-right px-3 md:px-6 py-1 text-sm text-muted-foreground">VAT (16%)</td>
                  <td className="text-right px-3 md:px-6 py-1 text-sm tabular-nums">KES {invoice.vat_amount.toLocaleString()}</td>
                </tr>
                <tr className="border-t border-border/40">
                  <td colSpan={3} className="text-right px-3 md:px-6 pt-3 pb-1 text-base font-bold">Total</td>
                  <td className="text-right px-3 md:px-6 pt-3 pb-1 text-base font-bold tabular-nums">KES {invoice.total.toLocaleString()}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-right px-3 md:px-6 py-1 text-sm">Balance Due</td>
                  <td className="text-right px-3 md:px-6 py-1 text-sm font-semibold tabular-nums">KES {invoice.balance_due.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <StatusBadge status={invoice.status} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Issue Date</p>
              <p className="font-medium">{invoice.issue_date}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Due Date</p>
              <p className="font-medium">{invoice.due_date}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Invoice #</p>
              <p className="font-medium">{invoice.invoice_number}</p>
            </div>
            {invoice.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-xs bg-muted p-3 rounded-lg text-muted-foreground">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
    </PageTransition>
  )
}
