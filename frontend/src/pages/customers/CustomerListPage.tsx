import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { listCustomers, type Customer } from "@/services/customers"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Plus, Eye } from "lucide-react"

export function CustomerListPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({ queryKey: ["customers"], queryFn: () => listCustomers() })

  const columns: Column<Customer>[] = [
    {
      key: "name", header: "Name",
      cell: (c) => (
        <button className="text-primary hover:underline font-medium" onClick={() => navigate(`/customers/${c.id}`)}>
          {c.first_name} {c.last_name}
        </button>
      ),
    },
    { key: "phone", header: "Phone" },
    { key: "email", header: "Email" },
    { key: "id_number", header: "ID No." },
    { key: "status", header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
    {
      key: "actions", header: "",
      cell: (c) => <Button variant="ghost" size="icon" onClick={() => navigate(`/customers/${c.id}`)}><Eye className="h-4 w-4" /></Button>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage your ISP subscribers"
        actions={<Button onClick={() => navigate("/customers/new")}><Plus className="h-4 w-4 mr-2" />New Customer</Button>}
      />
      <DataTable columns={columns} data={data ?? []} loading={isLoading} emptyMessage="No customers yet" />
    </div>
  )
}
