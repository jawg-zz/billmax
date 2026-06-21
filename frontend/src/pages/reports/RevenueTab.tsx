import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { revenueReport, exportCsv } from "@/services/reports"
import { useDateRange } from "./useDateRange"
import { TrendingUp, DollarSign, Receipt, Download } from "lucide-react"

export default function RevenueTab() {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [params, setParams] = useState<{ from_date?: string; to_date?: string }>({})
  const { presets } = useDateRange()
  const { data, isLoading } = useQuery({
    queryKey: ["report-revenue", params],
    queryFn: () => revenueReport(params),
  })

  const chartData = useMemo(() => {
    if (!data) return []
    const reversed = [...data.months].reverse()
    return reversed.map((m: any, i: number) => ({
      ...m,
      prevRevenue: i > 0 ? reversed[i - 1].revenue : null,
    }))
  }, [data])

  const momGrowth = useMemo(() => {
    if (!data?.months || data.months.length < 2) return null
    const sorted = [...data.months].reverse()
    const current = sorted[sorted.length - 1]?.revenue || 0
    const prev = sorted[sorted.length - 2]?.revenue || 0
    if (prev === 0) return null
    return ((current - prev) / prev * 100).toFixed(1)
  }, [data])

  const handlePreset = (preset: typeof presets[0]) => {
    setFrom(preset.from)
    setTo(preset.to)
    setParams({
      ...(preset.from ? { from_date: preset.from } : {}),
      ...(preset.to ? { to_date: preset.to } : {}),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 items-end">
        {presets.map((p) => (
          <Button
            key={p.label}
            size="sm"
            variant={
              from === p.from && to === p.to && Object.keys(params).length > 0
                ? "default"
                : "outline"
            }
            onClick={() => handlePreset(p)}
          >
            {p.label}
          </Button>
        ))}
        <div className="w-px h-8 bg-border mx-1" />
        <div className="space-y-1">
          <label className="text-xs font-medium">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8" />
        </div>
        <Button size="sm" onClick={() => setParams({ from_date: from || undefined, to_date: to || undefined })}>Filter</Button>
        <Button size="sm" variant="outline" onClick={() => exportCsv("revenue", params)} className="gap-1">
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      {isLoading ? <div className="text-center py-8 text-muted-foreground">Loading...</div> : data ? (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card className="shadow-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Total Revenue</CardTitle>
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">KES {data.totals.total_revenue.toLocaleString()}</div>
                {momGrowth && (
                  <div className={`flex items-center gap-1 text-xs mt-1 ${Number(momGrowth) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    <TrendingUp className={`h-3 w-3 ${Number(momGrowth) < 0 ? "rotate-180" : ""}`} />
                    {momGrowth}% vs last month
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Total VAT</CardTitle>
                <div className="rounded-lg bg-orange-500/10 p-2">
                  <Receipt className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent className="text-2xl font-bold">KES {data.totals.total_vat.toLocaleString()}</CardContent>
            </Card>
            <Card className="shadow-card">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Invoices Paid</CardTitle>
                <div className="rounded-lg bg-green-500/10 p-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{data.totals.total_invoices}</CardContent>
            </Card>
          </div>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-sm">Monthly Revenue</CardTitle></CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                  <Bar dataKey="revenue" fill="#0c8ee7" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="prevRevenue" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls strokeDasharray="4 4" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="rounded-xl border border-border/50 overflow-hidden shadow-card">
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
                  <tr key={m.label} className="border-b border-border/50 last:border-0">
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
