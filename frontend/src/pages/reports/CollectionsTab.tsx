import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { collectionsReport, exportCsv } from "@/services/reports"
import { useDateRange } from "./useDateRange"
import { Download, DollarSign, Banknote, AlertTriangle, TrendingUp } from "lucide-react"

export default function CollectionsTab() {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [params, setParams] = useState<{ from_date?: string; to_date?: string }>({})
  const { presets } = useDateRange()
  const { data, isLoading } = useQuery({
    queryKey: ["report-collections", params],
    queryFn: () => collectionsReport(params),
  })

  const handlePreset = (preset: typeof presets[0]) => {
    setFrom(preset.from)
    setTo(preset.to)
    setParams({
      ...(preset.from ? { from_date: preset.from } : {}),
      ...(preset.to ? { to_date: preset.to } : {}),
    })
  }

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  if (!data) return null

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
        <Button size="sm" variant="outline" onClick={() => exportCsv("collections", params)} className="gap-1">
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Total Billed</CardTitle>
            <div className="rounded-lg bg-blue-500/10 p-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="text-xl font-bold">KES {data.total_billed.toLocaleString()}</CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Collected</CardTitle>
            <div className="rounded-lg bg-green-500/10 p-2">
              <Banknote className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="text-xl font-bold text-green-600">KES {data.total_collected.toLocaleString()}</CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Outstanding</CardTitle>
            <div className="rounded-lg bg-orange-500/10 p-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="text-xl font-bold text-orange-600">KES {data.total_outstanding.toLocaleString()}</CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Collection Rate</CardTitle>
            <div className="rounded-lg bg-purple-500/10 p-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="text-xl font-bold">{data.collection_rate}%</CardContent>
        </Card>
      </div>

      {data.monthly && data.monthly.length > 0 && (
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-sm">Collected vs Outstanding by Month</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly}>
                <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `KES ${v.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outstanding" name="Outstanding" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="h-4 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.min(data.collection_rate, 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>{data.paid_invoices} paid</span>
            <span>{data.overdue_invoices} overdue</span>
            <span>{data.total_invoices} total</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
