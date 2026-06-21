import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { customerReport, exportCsv } from "@/services/reports"
import { useDateRange } from "./useDateRange"
import { Download, Users, UserCheck, UserX, UserPlus } from "lucide-react"

export default function CustomersTab() {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [params, setParams] = useState<{ from_date?: string; to_date?: string }>({})
  const { presets } = useDateRange()
  const { data, isLoading } = useQuery({
    queryKey: ["report-customers", params],
    queryFn: () => customerReport(params),
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
        <Button size="sm" variant="outline" onClick={() => exportCsv("customers", params)} className="gap-1">
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Total</CardTitle>
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="text-xl font-bold">{data.total_customers}</CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Active</CardTitle>
            <div className="rounded-lg bg-green-500/10 p-2">
              <UserCheck className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="text-xl font-bold text-green-600">{data.active_customers}</CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Suspended</CardTitle>
            <div className="rounded-lg bg-orange-500/10 p-2">
              <UserX className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="text-xl font-bold text-orange-600">{data.suspended_customers}</CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">New (Period)</CardTitle>
            <div className="rounded-lg bg-purple-500/10 p-2">
              <UserPlus className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="text-xl font-bold">{data.new_customers}</CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
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
