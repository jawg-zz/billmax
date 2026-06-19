import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { planReport } from "@/services/reports"

const COLORS = ["#0c8ee7", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]

export default function PlansTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["report-plans"],
    queryFn: () => planReport(),
  })

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Subscribers by Plan</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.plans} dataKey="subscribers" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                  {data.plans.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Monthly Revenue by Plan</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.plans} dataKey="monthly_revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                  {data.plans.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-2">Plan</th>
              <th className="text-left px-4 py-2">Type</th>
              <th className="text-left px-4 py-2">Speed</th>
              <th className="text-right px-4 py-2">Price</th>
              <th className="text-right px-4 py-2">Subscribers</th>
              <th className="text-right px-4 py-2">Monthly Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.plans.map((p: any) => (
              <tr key={p.name} className="border-b last:border-0">
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2"><StatusBadge status={p.type} /></td>
                <td className="px-4 py-2">{p.speed}</td>
                <td className="px-4 py-2 text-right">KES {p.price.toLocaleString()}</td>
                <td className="px-4 py-2 text-right">{p.subscribers}</td>
                <td className="px-4 py-2 text-right font-medium">KES {p.monthly_revenue.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
