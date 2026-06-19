import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { customerReport } from "@/services/reports"

export default function CustomersTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["report-customers"],
    queryFn: () => customerReport(),
  })

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent className="text-xl font-bold">{data.total_customers}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Active</CardTitle></CardHeader><CardContent className="text-xl font-bold text-green-600">{data.active_customers}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Suspended</CardTitle></CardHeader><CardContent className="text-xl font-bold text-orange-600">{data.suspended_customers}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">New (Period)</CardTitle></CardHeader><CardContent className="text-xl font-bold">{data.new_customers}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Signups by Month</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[...data.signups_by_month].reverse()}>
              <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
