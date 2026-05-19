import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { portalInvoices, portalPayInvoice, portalMe, type PortalCustomer } from "@/services/portal"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ArrowLeft, Smartphone, Loader2 } from "lucide-react"

export function PortalInvoicesPage() {
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<PortalCustomer | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [payMsg, setPayMsg] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("portal_token")
    if (!token) { navigate("/portal/login"); return }
    portalMe().then(setCustomer).catch(() => navigate("/portal/login"))
  }, [])

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["portal-invoices"],
    queryFn: () => portalInvoices(),
    enabled: !!customer,
  })

  const handlePay = async (id: string) => {
    setPayingId(id)
    setPayMsg("")
    try {
      const res = await portalPayInvoice(id)
      if (res.success) setPayMsg("STK push sent to your phone. Enter PIN to complete.")
      else setPayMsg(res.error || "Payment failed")
    } catch {
      setPayMsg("Payment request failed")
    } finally {
      setPayingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/portal")}><ArrowLeft className="h-4 w-4" /></Button>
          <span className="font-semibold">My Invoices</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {payMsg && (
          <div className="text-sm bg-blue-50 text-blue-800 p-3 rounded-md">{payMsg}</div>
        )}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : invoices?.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No invoices</CardContent></Card>
        ) : (
          invoices?.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{inv.invoice_number}</span>
                    <div className="text-sm text-muted-foreground">Due: {inv.due_date}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">KES {inv.total.toLocaleString()}</div>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <span className="text-sm">
                    {inv.balance_due > 0 ? `Balance: KES ${inv.balance_due.toLocaleString()}` : "Paid in full"}
                  </span>
                  {inv.balance_due > 0 && (
                    <Button size="sm" disabled={payingId === inv.id} onClick={() => handlePay(inv.id)}>
                      {payingId === inv.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Smartphone className="h-4 w-4 mr-1" />}
                      Pay with M-Pesa
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  )
}
