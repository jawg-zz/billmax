import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { useQuery } from "@tanstack/react-query"
import api from "@/services/api"
import { Skeleton } from "@/components/ui/Skeleton"

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/50 bg-card/95 backdrop-blur-md px-3 py-2 shadow-lg text-sm">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="font-semibold text-foreground tabular-nums">
        KES {payload[0].value.toLocaleString()}
      </p>
    </div>
  )
}

export function RevenueChart() {
  const { data, isLoading } = useQuery({
    queryKey: ["revenue-chart"],
    queryFn: async () => {
      const res = await api.get("/invoices", { params: { limit: 500 } })
      const invoices = res.data as any[]
      const byMonth: Record<string, number> = {}
      for (const inv of invoices) {
        if (inv.status === "paid") {
          const d = new Date(inv.issue_date)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
          byMonth[key] = (byMonth[key] || 0) + inv.total
        }
      }
      const now = new Date()
      const months: { name: string; revenue: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        months.push({ name: monthNames[d.getMonth()], revenue: byMonth[key] || 0 })
      }
      return months
    },
  })

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-full space-y-3 px-2">
          <div className="flex items-end justify-between h-48 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex-1 h-full flex items-end">
                <div className="w-full rounded-t-md bg-muted" style={{ height: `${40 + Math.random() * 60}%` }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-8" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data ?? []}>
          <XAxis
            dataKey="name"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.5)" }} />
          <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
