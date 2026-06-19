import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { collectionsReport } from "@/services/reports"

export default function CollectionsTab() {
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
