import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { portalMe, portalInvoices, portalSubscription, portalTickets, portalChangePassword, type PortalCustomer } from "@/services/portal"
import { portalUsage } from "@/services/usage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { LogOut, Wifi, Receipt, Ticket, User, Key, ArrowRight, Activity } from "lucide-react"

export function PortalDashboardPage() {
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<PortalCustomer | null>(null)
  const [pwCurrent, setPwCurrent] = useState("")
  const [pwNew, setPwNew] = useState("")
  const [pwMsg, setPwMsg] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("portal_token")
    if (!token) { navigate("/portal/login"); return }
    portalMe().then(setCustomer).catch(() => { localStorage.removeItem("portal_token"); navigate("/portal/login") })
  }, [])

  const { data: invoices } = useQuery({
    queryKey: ["portal-invoices"],
    queryFn: () => portalInvoices(),
    enabled: !!customer,
  })

  const { data: subData } = useQuery({
    queryKey: ["portal-subscription"],
    queryFn: () => portalSubscription(),
    enabled: !!customer,
  })

  const { data: usageData } = useQuery({
    queryKey: ["portal-usage"],
    queryFn: () => portalUsage(),
    enabled: !!customer,
  })

  const { data: tickets } = useQuery({
    queryKey: ["portal-tickets"],
    queryFn: () => portalTickets(),
    enabled: !!customer,
  })

  const handleLogout = () => {
    localStorage.removeItem("portal_token")
    navigate("/portal/login")
  }

  const handleChangePassword = async () => {
    setPwMsg("")
    try {
      await portalChangePassword(pwCurrent, pwNew)
      setPwMsg("Password changed successfully")
      setPwCurrent("")
      setPwNew("")
    } catch {
      setPwMsg("Current password is incorrect")
    }
  }

  if (!customer) return <div className="text-center py-12 text-muted-foreground">Loading...</div>

  const subscription = subData?.subscription
  const unpaid = invoices?.filter((i) => i.status !== "paid") ?? []
  const openTickets = tickets?.filter((t) => t.status !== "closed" && t.status !== "resolved") ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-emerald-600 flex items-center justify-center">
              <Wifi className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold">My ISP Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{customer.first_name} {customer.last_name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/portal/invoices")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Invoices</CardTitle>
              <Receipt className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invoices?.length ?? 0}</div>
              <p className="text-xs text-muted-foreground">{unpaid.length} unpaid</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Subscription</CardTitle>
              <Wifi className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              {subscription ? (
                <>
                  <div className="text-sm font-medium">{subscription.plan?.name}</div>
                  <StatusBadge status={subscription.status} />
                  <div className="mt-2 text-xs text-muted-foreground">
                    {subscription.plan?.download_speed_mbps}/{subscription.plan?.upload_speed_mbps} Mbps
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No active subscription</p>
              )}
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/portal/tickets")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tickets</CardTitle>
              <Ticket className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openTickets.length}</div>
              <p className="text-xs text-muted-foreground">open tickets</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Data Usage</CardTitle>
              <Activity className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              {usageData?.usage ? (
                <>
                  <div className="text-2xl font-bold">{usageData.usage.total_gb.toFixed(1)} GB</div>
                  {usageData.usage.data_cap_gb ? (
                    <div className="mt-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            usageData.usage.usage_percent >= 100 ? "bg-red-500" :
                            usageData.usage.usage_percent >= 80 ? "bg-yellow-500" : "bg-green-500"
                          }`}
                          style={{ width: `${Math.min(usageData.usage.usage_percent, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {usageData.usage.usage_percent.toFixed(0)}% of {usageData.usage.data_cap_gb} GB cap
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Unlimited plan</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No data</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Unpaid Invoices</CardTitle>
            <Button variant="link" size="sm" onClick={() => navigate("/portal/invoices")}>View all <ArrowRight className="h-3 w-3 ml-1" /></Button>
          </CardHeader>
          <CardContent>
            {unpaid.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">All invoices paid ✅</p>
            ) : (
              <div className="space-y-2">
                {unpaid.slice(0, 5).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <span className="text-sm font-medium">{inv.invoice_number}</span>
                      <p className="text-xs text-muted-foreground">Due: {inv.due_date}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">KES {inv.balance_due.toLocaleString()}</div>
                      <Button size="sm" variant="link" className="h-auto p-0 text-xs" onClick={() => navigate(`/portal/invoices`)}>Pay now</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Change Portal PIN</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} placeholder="Current PIN" />
            <Input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder="New PIN" />
            <Button size="sm" onClick={handleChangePassword} disabled={!pwCurrent || !pwNew}>Change PIN</Button>
            {pwMsg && <p className="text-xs text-muted-foreground">{pwMsg}</p>}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
