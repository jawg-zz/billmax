import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { useQuery } from "@tanstack/react-query"
import api from "@/services/api"

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function RevenueChart() {
  const { data } = useQuery({
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

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data ?? []}>
          <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: number) => [`KES ${v.toLocaleString()}`, "Revenue"]} />
          <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
