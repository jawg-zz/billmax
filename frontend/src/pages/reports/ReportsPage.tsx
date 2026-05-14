import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { revenueReport, collectionsReport, customerReport, planReport, taxReport } from "@/services/reports"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const tabs = [
  { key: "revenue", label: "Revenue" },
  { key: "collections", label: "Collections" },
  { key: "customers", label: "Customers" },
  { key: "plans", label: "Plans" },
  { key: "tax", label: "Tax (VAT)" },
]

const COLORS = ["#0c8ee7", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]

function RevenueTab() {
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

function CollectionsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["report-collections"],
    queryFn: () => collectionsReport(),
  })

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Billed</CardTitle></CardHeader><CardContent className="text-xl font-bold">KES {data.total_billed.toLocaleString()}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Collected</CardTitle></CardHeader><CardContent className="text-xl font-bold text-green-600">KES {data.total_collected.toLocaleString()}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Outstanding</CardTitle></CardHeader><CardContent className="text-xl font-bold text-orange-600">KES {data.total_outstanding.toLocaleString()}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Collection Rate</CardTitle></CardHeader><CardContent className="text-xl font-bold">{data.collection_rate}%</CardContent></Card>
      </div>
      <Card>
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

function CustomersTab() {
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

function PlansTab() {
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

function TaxTab() {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [params, setParams] = useState<{ from_date?: string; to_date?: string }>({})
  const { data, isLoading } = useQuery({
    queryKey: ["report-tax", params],
    queryFn: () => taxReport(params),
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
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Excl. VAT</CardTitle></CardHeader><CardContent className="text-xl font-bold">KES {data.totals.total_subtotal.toLocaleString()}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">VAT 16%</CardTitle></CardHeader><CardContent className="text-xl font-bold text-orange-600">KES {data.totals.total_vat.toLocaleString()}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Incl. VAT</CardTitle></CardHeader><CardContent className="text-xl font-bold">KES {data.totals.total_with_vat.toLocaleString()}</CardContent></Card>
          </div>

          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2">Month</th>
                  <th className="text-right px-4 py-2">Subtotal</th>
                  <th className="text-right px-4 py-2">VAT (16%)</th>
                  <th className="text-right px-4 py-2">Total</th>
                  <th className="text-right px-4 py-2">Invoices</th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((m: any) => (
                  <tr key={m.label} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">{m.label}</td>
                    <td className="px-4 py-2 text-right">KES {m.subtotal.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">KES {m.vat_16.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">KES {m.total.toLocaleString()}</td>
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

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState("revenue")

  const tabComponents: Record<string, React.FC> = {
    revenue: RevenueTab,
    collections: CollectionsTab,
    customers: CustomersTab,
    plans: PlansTab,
    tax: TaxTab,
  }
  const ActiveComponent = tabComponents[activeTab]

  return (
    <div>
      <PageHeader title="Reports" description="Business analytics and tax summaries" />
      <div className="flex gap-1 mb-6 border-b pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTab === t.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ActiveComponent />
    </div>
  )
}
