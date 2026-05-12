import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { listCustomers, type Customer } from "@/services/customers"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Eye, Search } from "lucide-react"

export function CustomerListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const { data, isLoading } = useQuery({ queryKey: ["customers"], queryFn: () => listCustomers() })

  const filtered = (data ?? []).filter((c) => {
    const q = search.toLowerCase()
    if (q && !`${c.first_name} ${c.last_name} ${c.phone} ${c.email ?? ""}`.toLowerCase().includes(q)) return false
    if (statusFilter && c.status !== statusFilter) return false
    return true
  })

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
      cell: (c) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/customers/${c.id}`)} title="View">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/customers/${c.id}/edit`)} title="Edit">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Customers"
        description={`${filtered.length} of ${data?.length ?? 0} subscribers`}
        actions={<Button onClick={() => navigate("/customers/new")}><Plus className="h-4 w-4 mr-2" />New Customer</Button>}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {["", "active", "suspended", "terminated"].map((s) => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)}>
            {s || "All"}
          </Button>
        ))}
      </div>

      <DataTable columns={columns} data={filtered} loading={isLoading} emptyMessage="No customers found" />
    </div>
  )
}
