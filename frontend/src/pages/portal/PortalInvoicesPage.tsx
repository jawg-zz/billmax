import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { portalInvoices, portalPayInvoice, portalMe, type PortalCustomer } from "@/services/portal"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ArrowLeft, Smartphone, Loader2, CheckCircle2, Receipt } from "lucide-react"

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/portal")}><ArrowLeft className="h-4 w-4" /></Button>
          <span className="font-semibold text-sm">My Invoices</span>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {payMsg && (
          <div className="text-sm bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200 p-3 rounded-md">{payMsg}</div>
        )}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="space-y-3 animate-pulse">
                    <div className="h-4 w-32 bg-muted/60 rounded" />
                    <div className="h-3 w-24 bg-muted/60 rounded" />
                    <div className="h-8 w-28 bg-muted/60 rounded" />
                    <div className="h-9 w-full bg-muted/60 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : invoices?.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No invoices</p>
            </CardContent>
          </Card>
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
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                  <span className="text-sm flex items-center gap-1.5">
                    {inv.balance_due > 0 ? (
                      `Balance: KES ${inv.balance_due.toLocaleString()}`
                    ) : (
                      <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Paid in full</>
                    )}
                  </span>
                  {inv.balance_due > 0 && (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={payingId === inv.id} onClick={() => handlePay(inv.id)}>
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
