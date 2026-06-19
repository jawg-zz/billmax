import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { revenueReport } from "@/services/reports"

export default function RevenueTab() {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [params, setParams] = useState<{ from_date?: string; to_date?: string }>({})
  const { data, isLoading } = useQuery({
    queryKey: ["report-revenue", params],
    queryFn: () => revenueReport(params),
  })

  return (
    <div className="space-y-6">
      <div className="flex gap-2 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8" />
        </div>
        <Button size="sm" onClick={() => setParams({ from_date: from || undefined, to_date: to || undefined })}>Filter</Button>
      </div>

      {isLoading ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : data ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Total Revenue</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold">KES {data.totals.total_revenue.toLocaleString()}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Total VAT</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold">KES {data.totals.total_vat.toLocaleString()}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Invoices Paid</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold">{data.totals.total_invoices}</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Monthly Revenue</CardTitle></CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...data.months].reverse()}>
                  <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                  <Bar dataKey="revenue" fill="#0c8ee7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2">Month</th>
                  <th className="text-right px-4 py-2">Revenue</th>
                  <th className="text-right px-4 py-2">VAT</th>
                  <th className="text-right px-4 py-2">Invoices</th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((m: any) => (
                  <tr key={m.label} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">{m.label}</td>
                    <td className="px-4 py-2 text-right">KES {m.revenue.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">KES {m.vat.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{m.invoice_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  )
}
