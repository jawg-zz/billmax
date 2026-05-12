import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { StatsCard } from "@/components/dashboard/StatsCard"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { RevenueChart } from "@/components/dashboard/RevenueChart"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/StatusBadge"
import api from "@/services/api"
import {
  Users, Radio, Receipt, Activity, AlertTriangle,
  TrendingUp, Wifi, Play, UserPlus,
} from "lucide-react"

interface Stats {
  total_customers: number
  active_subscriptions: number
  overdue_invoices: number
  total_outstanding: number
  active_plans: number
  unprovisioned_subs: number
  monthly_revenue: number
  collection_rate: number
  overdue_aging: {
    days_1_7: number
    days_8_14: number
    days_15_29: number
    over_30: number
  }
}

export function DashboardPage() {
  const navigate = useNavigate()

  const { data: stats } = useQuery<Stats>({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/dashboard/stats").then((r) => r.data),
    refetchInterval: 30000,
  })

  const { data: activity } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: () => api.get("/dashboard/activity").then((r) => r.data),
    refetchInterval: 15000,
  })

  const aging = [
    { label: "1-7 days", count: stats?.overdue_aging.days_1_7 ?? 0, color: "bg-yellow-400" },
    { label: "8-14 days", count: stats?.overdue_aging.days_8_14 ?? 0, color: "bg-orange-400" },
    { label: "15-29 days", count: stats?.overdue_aging.days_15_29 ?? 0, color: "bg-red-400" },
    { label: "30+ days", count: stats?.overdue_aging.over_30 ?? 0, color: "bg-red-700" },
  ]

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your ISP operations" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatsCard title="Customers" value={stats?.total_customers ?? 0} icon={Users} color="text-blue-600" />
        <StatsCard title="Active Subs" value={stats?.active_subscriptions ?? 0} icon={Radio} color="text-green-600" />
        <StatsCard title="Outstanding" value={`KES ${(stats?.total_outstanding ?? 0).toLocaleString()}`} icon={Receipt} color="text-orange-600" />
        <StatsCard title="Revenue (MTD)" value={`KES ${(stats?.monthly_revenue ?? 0).toLocaleString()}`} icon={TrendingUp} color="text-emerald-600" />
        <StatsCard title="Collection Rate" value={`${stats?.collection_rate ?? 0}%`} icon={Activity} color="text-purple-600" subtitle={`${stats?.overdue_invoices ?? 0} overdue`} />
        <StatsCard title="Unprovisioned" value={stats?.unprovisioned_subs ?? 0} icon={Wifi} color="text-sky-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Revenue (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Overdue Aging</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aging.map((a) => (
                <div key={a.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{a.label}</span>
                    <span className="font-medium">{a.count} invoices</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${a.color} transition-all`}
                      style={{ width: `${Math.min((a.count / Math.max(stats?.overdue_invoices ?? 1, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-2 text-sm text-muted-foreground">
                Total outstanding: <span className="font-medium text-foreground">KES {(stats?.total_outstanding ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed items={activity ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => navigate("/subscriptions")}>
                <Play className="h-4 w-4 mr-2 text-green-600" />Run Billing
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => navigate("/invoices")}>
                <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />Overdue
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => navigate("/customers/new")}>
                <UserPlus className="h-4 w-4 mr-2 text-blue-600" />New Customer
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => navigate("/subscriptions")}>
                <Wifi className="h-4 w-4 mr-2 text-sky-600" />Provision
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1 text-xs text-muted-foreground">
              <StatusBadge status={stats && stats.active_subscriptions > 0 ? "active" : "pending"} />
              <span>{stats?.active_subscriptions ?? 0} active subs · {stats?.unprovisioned_subs ?? 0} need provisioning</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
