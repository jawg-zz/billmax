import { useQuery } from "@tanstack/react-query"
import { listMpesaTransactions, type MpesaTransaction } from "@/services/mpesa"
import { PageHeader } from "@/components/shared/PageHeader"
import { PageTransition } from "@/components/shared/PageTransition"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/ui/EmptyState"
import { Phone } from "lucide-react"

const columns: Column<MpesaTransaction>[] = [
  { key: "type", header: "Type", sortable: true },
  { key: "phone", header: "Phone", sortable: true },
  {
    key: "amount", header: "Amount (KES)", sortable: true,
    sortValue: (t) => t.amount,
    cell: (t) => <span className="font-medium tabular-nums">KES {t.amount.toLocaleString()}</span>,
  },
  { key: "receipt", header: "Receipt", cell: (t) => t.receipt ?? <span className="text-muted-foreground">—</span> },
  { key: "status", header: "Status", sortable: true, cell: (t) => <StatusBadge status={t.status} /> },
  {
    key: "created_at", header: "Date", sortable: true,
    sortValue: (t) => t.created_at,
    cell: (t) => new Date(t.created_at).toLocaleDateString(),
  },
]

export function MpesaPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["mpesa"],
    queryFn: () => listMpesaTransactions(),
  })

  return (
    <PageTransition>
      <PageHeader
        title="M-Pesa Transactions"
        description={`${data?.length ?? 0} Safaricom Daraja API transactions`}
      />

      {!isLoading && (data ?? []).length === 0 ? (
        <EmptyState
          icon={<Phone className="h-12 w-12" />}
          title="No M-Pesa transactions yet"
          description="Transactions will appear here when customers pay or when you send STK Push requests"
        />
      ) : (
        <DataTable columns={columns} data={data ?? []} loading={isLoading} pageSize={25} minWidth="600px" />
      )}
    </PageTransition>
  )
}
