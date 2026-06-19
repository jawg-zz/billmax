import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { portalMe, portalInvoices, portalSubscription, portalTickets, portalChangePassword, type PortalCustomer } from "@/services/portal"
import { portalUsage } from "@/services/usage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { LogOut, Wifi, Receipt, Ticket, Key, ArrowRight, Activity, ChevronDown, ChevronUp } from "lucide-react"

export function PortalDashboardPage() {
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<PortalCustomer | null>(null)
  const [pwCurrent, setPwCurrent] = useState("")
  const [pwNew, setPwNew] = useState("")
  const [pwMsg, setPwMsg] = useState("")
  const [pwOpen, setPwOpen] = useState(false)

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

  const usagePercent = usageData?.usage?.usage_percent ?? 0
  const progressColor =
    usagePercent >= 100 ? "from-red-500 to-red-600" :
    usagePercent >= 80 ? "from-amber-500 to-amber-600" :
    "from-emerald-500 to-emerald-600"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Wifi className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sm">My ISP Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{customer.first_name} {customer.last_name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card
            className="cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            onClick={() => navigate("/portal/invoices")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Invoices</CardTitle>
              <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-1.5">
                <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invoices?.length ?? 0}</div>
              <p className="text-xs text-muted-foreground">{unpaid.length} unpaid</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Subscription</CardTitle>
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/30 p-1.5">
                <Wifi className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <>
                  <div className="text-sm font-medium truncate">{subscription.plan?.name}</div>
                  <div className="mt-1"><StatusBadge status={subscription.status} /></div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {subscription.plan?.download_speed_mbps}/{subscription.plan?.upload_speed_mbps} Mbps
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No active subscription</p>
              )}
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            onClick={() => navigate("/portal/tickets")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tickets</CardTitle>
              <div className="rounded-lg bg-orange-100 dark:bg-orange-900/30 p-1.5">
                <Ticket className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openTickets.length}</div>
              <p className="text-xs text-muted-foreground">open tickets</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Data Usage</CardTitle>
              <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-1.5">
                <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              {usageData?.usage ? (
                <>
                  <div className="text-2xl font-bold">{usageData.usage.total_gb.toFixed(1)} GB</div>
                  {usageData.usage.data_cap_gb ? (
                    <div className="mt-1">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${progressColor}`}
                          style={{ width: `${Math.min(usagePercent, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {usagePercent.toFixed(0)}% of {usageData.usage.data_cap_gb} GB cap
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
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
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
          <CardHeader
            className="flex flex-row items-center gap-2 cursor-pointer select-none"
            onClick={() => setPwOpen(!pwOpen)}
          >
            <Key className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium flex-1">Change Portal PIN</CardTitle>
            {pwOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </CardHeader>
          {pwOpen && (
            <CardContent className="space-y-3">
              <Input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} placeholder="Current PIN" />
              <Input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder="New PIN" />
              <Button size="sm" onClick={handleChangePassword} disabled={!pwCurrent || !pwNew}>Change PIN</Button>
              {pwMsg && <p className="text-xs text-muted-foreground">{pwMsg}</p>}
            </CardContent>
          )}
        </Card>
      </main>
    </div>
  )
}
