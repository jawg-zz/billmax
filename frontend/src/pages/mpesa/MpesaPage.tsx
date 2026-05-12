import { useQuery } from "@tanstack/react-query"
import { listMpesaTransactions, type MpesaTransaction } from "@/services/mpesa"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"

const columns: Column<MpesaTransaction>[] = [
  { key: "type", header: "Type" },
  { key: "phone", header: "Phone" },
  { key: "amount", header: "Amount (KES)", cell: (t) => t.amount.toLocaleString() },
  { key: "receipt", header: "Receipt", cell: (t) => t.receipt ?? "—" },
  { key: "status", header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
  { key: "created_at", header: "Date", cell: (t) => new Date(t.created_at).toLocaleDateString() },
]

export function MpesaPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["mpesa"],
    queryFn: () => listMpesaTransactions(),
  })

  return (
    <div>
      <PageHeader title="M-Pesa Transactions" description="Safaricom Daraja API transactions" />
      <DataTable columns={columns} data={data ?? []} loading={isLoading} />
    </div>
  )
}
