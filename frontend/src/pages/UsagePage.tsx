import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getUsageSummary, enforceFup } from "@/services/usage"
import { PageHeader } from "@/components/shared/PageHeader"
import { PageTransition } from "@/components/shared/PageTransition"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CardSkeleton } from "@/components/ui/Skeleton"
import { Skeleton } from "@/components/ui/Skeleton"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/Toaster"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Activity, Zap, AlertTriangle, Search, Loader2 } from "lucide-react"

export function UsagePage() {
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [enforcing, setEnforcing] = useState(false)
  const [enforceResult, setEnforceResult] = useState<string | null>(null)

  const { data: summaries, isLoading, refetch } = useQuery({
    queryKey: ["usage-summary"],
    queryFn: () => getUsageSummary({ days: 30 }),
  })

  const filtered = summaries?.filter(
    (s) =>
      s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      s.plan_name.toLowerCase().includes(search.toLowerCase()),
  )

  const handleEnforceFup = async () => {
    setEnforcing(true)
    setEnforceResult(null)
    try {
      const res = await enforceFup()
      setEnforceResult(`${res.alerts_created} FUP alerts triggered`)
      refetch()
      toast("success", "FUP enforced", `${res.alerts_created} alerts triggered`)
    } catch {
      setEnforceResult("Failed to enforce FUP")
      toast("error", "Failed to enforce FUP")
    } finally {
      setEnforcing(false)
    }
  }

  const chartData = (filtered || [])
    .filter((s) => s.data_cap_gb)
    .map((s) => ({
      name: s.customer_name.split(" ")[0],
      usage: s.total_gb,
      cap: s.data_cap_gb,
      percent: s.usage_percent,
    }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 20)

  const highUsage = filtered?.filter((s) => s.data_cap_gb && s.usage_percent >= 80).length ?? 0
  const cappedCustomers = filtered?.filter((s) => s.data_cap_gb).length ?? 0
  const totalData = filtered?.reduce((sum, s) => sum + s.total_gb, 0) ?? 0

  return (
    <PageTransition>
      <div className="space-y-6">
        <PageHeader
          title="Network Usage"
          description="Monitor bandwidth usage and enforce fair usage policy"
          actions={
            <Button variant="outline" size="sm" onClick={handleEnforceFup} disabled={enforcing}>
              {enforcing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
              Enforce FUP
            </Button>
          }
        />

        {enforceResult && (
          <div className={`text-sm p-3 rounded-md ${
            enforceResult.includes("Failed") ? "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-400" : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
          }`}>
            {enforceResult}
          </div>
        )}

        {isLoading ? (
          <CardSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscribers</CardTitle>
                <Activity className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filtered?.length ?? 0}</div>
              </CardContent>
            </Card>
            <Card className="transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Capped Plans</CardTitle>
                <Activity className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cappedCustomers}</div>
              </CardContent>
            </Card>
            <Card className="transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Near Cap (&ge;80%)</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{highUsage}</div>
              </CardContent>
            </Card>
            <Card className="transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Data Used</CardTitle>
                <Activity className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalData.toFixed(1)} GB</div>
              </CardContent>
            </Card>
          </div>
        )}

        {!isLoading && chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Usage vs Cap (Top 20)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis unit=" GB" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="usage" name="Used (GB)" stackId="a">
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.percent >= 100 ? "#ef4444" : entry.percent >= 80 ? "#f59e0b" : "#22c55e"} />
                      ))}
                    </Bar>
                    <Bar dataKey="cap" name="Cap (GB)" stackId="a" fill="#e5e7eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer or plan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <span className="text-sm text-muted-foreground">{filtered?.length ?? 0} results</span>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Customer</th>
                    <th className="text-left p-3 text-sm font-semibold text-muted-foreground">Plan</th>
                    <th className="text-right p-3 text-sm font-semibold text-muted-foreground">Download</th>
                    <th className="text-right p-3 text-sm font-semibold text-muted-foreground">Upload</th>
                    <th className="text-right p-3 text-sm font-semibold text-muted-foreground">Total</th>
                    <th className="text-right p-3 text-sm font-semibold text-muted-foreground">Cap</th>
                    <th className="text-right p-3 text-sm font-semibold text-muted-foreground">Usage</th>
                  </tr>
                </thead>
                <tbody>
                  {(filtered ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        {search ? "No results match your search" : "No usage data available"}
                      </td>
                    </tr>
                  ) : (
                    (filtered ?? []).map((s) => (
                      <tr key={s.subscription_id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="p-3 text-sm font-medium">{s.customer_name}</td>
                        <td className="p-3 text-sm">{s.plan_name}</td>
                        <td className="p-3 text-sm text-right tabular-nums">{s.download_gb.toFixed(2)} GB</td>
                        <td className="p-3 text-sm text-right tabular-nums">{s.upload_gb.toFixed(2)} GB</td>
                        <td className="p-3 text-sm text-right font-medium tabular-nums">{s.total_gb.toFixed(2)} GB</td>
                        <td className="p-3 text-sm text-right">{s.data_cap_gb ? `${s.data_cap_gb} GB` : <span className="text-muted-foreground">Unlimited</span>}</td>
                        <td className="p-3 text-sm text-right">
                          {s.data_cap_gb ? (
                            <Badge
                              variant={
                                s.usage_percent >= 100
                                  ? "destructive"
                                  : s.usage_percent >= 80
                                    ? "warning"
                                    : "success"
                              }
                            >
                              {s.usage_percent.toFixed(0)}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
