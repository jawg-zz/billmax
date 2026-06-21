import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { planReport, exportCsv } from "@/services/reports"
import { Download, Radio, DollarSign } from "lucide-react"

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
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => exportCsv("plans")} className="gap-1">
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Subscribers by Plan</CardTitle>
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Radio className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
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
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Monthly Revenue by Plan</CardTitle>
            <div className="rounded-lg bg-green-500/10 p-2">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
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
      <div className="rounded-xl border border-border/50 overflow-hidden shadow-card">
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
              <tr key={p.name} className="border-b border-border/50 last:border-0">
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
