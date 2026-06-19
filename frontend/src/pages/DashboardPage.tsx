import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { StatsCard } from "@/components/dashboard/StatsCard"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { RevenueChart } from "@/components/dashboard/RevenueChart"
import { PageHeader } from "@/components/shared/PageHeader"
import { PageTransition } from "@/components/shared/PageTransition"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CardSkeleton } from "@/components/ui/Skeleton"
import { Skeleton } from "@/components/ui/Skeleton"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/StatusBadge"
import api from "@/services/api"
import {
  Users, Radio, Receipt, Activity, AlertTriangle,
  TrendingUp, Wifi, Play, UserPlus, Loader2,
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
  const [billingRunning, setBillingRunning] = useState(false)

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["dashboard"],
    queryFn: () => api.get("/dashboard/stats").then((r) => r.data),
    refetchInterval: 30000,
  })

  const { data: activity, isLoading: activityLoading } = useQuery({
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

  const maxOverdue = Math.max(...aging.map((a) => a.count), 1)

  return (
    <PageTransition>
      <PageHeader title="Dashboard" description="Overview of your ISP operations" />

      {isLoading ? (
        <CardSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <StatsCard title="Customers" value={stats?.total_customers ?? 0} icon={Users} color="text-blue-600" />
          <StatsCard title="Active Subs" value={stats?.active_subscriptions ?? 0} icon={Radio} color="text-green-600" />
          <StatsCard title="Outstanding" value={`KES ${(stats?.total_outstanding ?? 0).toLocaleString()}`} icon={Receipt} color="text-orange-600" />
          <StatsCard title="Revenue (MTD)" value={`KES ${(stats?.monthly_revenue ?? 0).toLocaleString()}`} icon={TrendingUp} color="text-emerald-600" />
          <StatsCard title="Collection Rate" value={`${stats?.collection_rate ?? 0}%`} icon={Activity} color="text-purple-600" subtitle={`${stats?.overdue_invoices ?? 0} overdue`} />
          <StatsCard title="Unprovisioned" value={stats?.unprovisioned_subs ?? 0} icon={Wifi} color="text-sky-600" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Revenue (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Overdue Aging</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {aging.map((a) => (
                  <div key={a.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">{a.label}</span>
                      <span className="font-medium tabular-nums">{a.count} invoices</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${a.color} transition-all duration-700 ease-out`}
                        style={{ width: `${(a.count / maxOverdue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-1 border-t border-border/50 mt-3">
                  <div className="flex justify-between text-sm pt-2">
                    <span className="text-muted-foreground">Total outstanding</span>
                    <span className="font-semibold text-foreground tabular-nums">KES {(stats?.total_outstanding ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5 pt-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ActivityFeed items={activity ?? []} />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="justify-start h-auto py-3.5 px-4 border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
                disabled={billingRunning}
                onClick={async () => {
                  setBillingRunning(true)
                  try { await api.post("/billing/run"); window.location.reload() } catch {} finally { setBillingRunning(false) }
                }}
              >
                {billingRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin text-emerald-500" /> : <Play className="h-4 w-4 mr-2 text-emerald-500" />}
                <span className="text-sm font-medium">{billingRunning ? "Running..." : "Run Billing"}</span>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto py-3.5 px-4 border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
                onClick={() => navigate("/invoices")}
              >
                <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                <span className="text-sm font-medium">Overdue</span>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto py-3.5 px-4 border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
                onClick={() => navigate("/customers/new")}
              >
                <UserPlus className="h-4 w-4 mr-2 text-blue-500" />
                <span className="text-sm font-medium">New Customer</span>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto py-3.5 px-4 border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
                onClick={() => navigate("/subscriptions")}
              >
                <Wifi className="h-4 w-4 mr-2 text-sky-500" />
                <span className="text-sm font-medium">Provision</span>
              </Button>
            </div>
            <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground border-t border-border/50 pt-3">
              <StatusBadge status={stats && stats.active_subscriptions > 0 ? "active" : "pending"} />
              <span>{stats?.active_subscriptions ?? 0} active subs · {stats?.unprovisioned_subs ?? 0} need provisioning</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  )
}
