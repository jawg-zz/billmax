import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/PageHeader"
import api from "@/services/api"
import { Users, Radio, Receipt, TrendingUp, Activity, AlertTriangle } from "lucide-react"

interface DashboardStats {
  total_customers: number
  active_subscriptions: number
  total_outstanding: number
  overdue_invoices: number
  active_plans: number
}

export function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await api.get("/dashboard/stats")
      return res.data
    },
    refetchInterval: 30000,
  })

  const stats = [
    { title: "Customers", value: data?.total_customers ?? 0, icon: Users, color: "text-blue-600" },
    { title: "Active Subs", value: data?.active_subscriptions ?? 0, icon: Radio, color: "text-green-600" },
    { title: "Outstanding", value: `KES ${(data?.total_outstanding ?? 0).toLocaleString()}`, icon: Receipt, color: "text-orange-600" },
    { title: "Overdue", value: data?.overdue_invoices ?? 0, icon: AlertTriangle, color: "text-red-600" },
    { title: "Active Plans", value: data?.active_plans ?? 0, icon: Activity, color: "text-purple-600" },
  ]

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your ISP operations" />
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Payment received from John Kamau — KES 5,000<br />
                  Invoice INV-202600015 sent to Mary Wanjiku<br />
                  New subscriber: Peter Otieno on Fiber 20Mbps<br />
                  Subscription suspended: James Kiprop (overdue)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  → Run billing cycle<br />
                  → Process overdue accounts<br />
                  → Reconcile M-Pesa transactions<br />
                  → Provision new subscribers
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
