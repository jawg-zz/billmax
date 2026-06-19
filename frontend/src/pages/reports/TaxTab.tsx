import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { taxReport } from "@/services/reports"

export default function TaxTab() {
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
