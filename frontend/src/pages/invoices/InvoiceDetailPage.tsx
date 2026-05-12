import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { getInvoice } from "@/services/invoices"
import { getCustomer, type Customer } from "@/services/customers"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

export function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => getInvoice(id!),
    enabled: !!id,
  })

  return (
    <div>
      <PageHeader
        title={`Invoice ${invoice?.invoice_number ?? ""}`}
        actions={
          <Button variant="outline" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
        }
      />
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : invoice ? (
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
      ) : null}
    </div>
  )
}
