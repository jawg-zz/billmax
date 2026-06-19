import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { listCustomers, deleteCustomer, approveCustomer, rejectCustomer, type Customer } from "@/services/customers"
import { PageHeader } from "@/components/shared/PageHeader"
import { PageTransition } from "@/components/shared/PageTransition"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/ui/EmptyState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/Toaster"
import { Plus, Eye, Search, Trash2, Check, X, Users } from "lucide-react"

export function CustomerListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      toast("success", "Customer deleted")
    },
    onError: () => toast("error", "Failed to delete customer"),
  })

  const approveMut = useMutation({
    mutationFn: (id: string) => approveCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      toast("success", "Customer approved")
    },
    onError: () => toast("error", "Failed to approve customer"),
  })

  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      toast("success", "Customer rejected")
    },
    onError: () => toast("error", "Failed to reject customer"),
  })

  const { data, isLoading } = useQuery({ queryKey: ["customers"], queryFn: () => listCustomers() })

  const filtered = (data ?? []).filter((c) => {
    const q = search.toLowerCase()
    if (q && !`${c.first_name} ${c.last_name} ${c.phone} ${c.email ?? ""}`.toLowerCase().includes(q)) return false
    if (statusFilter && c.status !== statusFilter) return false
    return true
  })

  const statusCounts = (data ?? []).reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const allStatuses = ["active", "suspended", "pending", "rejected", "terminated"]

  const columns: Column<Customer>[] = [
    {
      key: "name", header: "Name", sortable: true,
      sortValue: (c) => `${c.first_name} ${c.last_name}`,
      cell: (c) => (
        <button className="text-primary hover:underline font-medium" onClick={() => navigate(`/customers/${c.id}`)}>
          {c.first_name} {c.last_name}
        </button>
      ),
    },
    { key: "phone", header: "Phone", sortable: true },
    { key: "email", header: "Email", sortable: true },
    { key: "id_number", header: "ID No." },
    {
      key: "status", header: "Status", sortable: true,
      cell: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: "actions", header: "",
      cell: (c) => (
        <div className="flex gap-1">
          {c.status === "pending" && (
            <>
              <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950" title="Approve" onClick={() => approveMut.mutate(c.id)}>
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950" title="Reject" onClick={() => rejectMut.mutate(c.id)}>
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={() => navigate(`/customers/${c.id}`)} title="View">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/customers/${c.id}/edit`)} title="Edit">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          </Button>
          <Button variant="ghost" size="icon" title="Delete" onClick={() => { if (confirm("Delete this customer?")) deleteMut.mutate(c.id) }}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <PageTransition>
      <PageHeader
        title="Customers"
        description={`${data?.length ?? 0} total subscribers`}
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
        <Button key="all" variant={statusFilter === "" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("")}>
          All ({data?.length ?? 0})
        </Button>
        {allStatuses.map((s) => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)} ({statusCounts[s] ?? 0})
          </Button>
        ))}
      </div>

      {!isLoading && filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title={search || statusFilter ? "No customers match your filters" : "No customers yet"}
          description={search || statusFilter ? "Try adjusting your search or filters" : "Add your first customer to get started with billing"}
          action={search || statusFilter ? undefined : { label: "New Customer", onClick: () => navigate("/customers/new") }}
        />
      ) : (
        <DataTable columns={columns} data={filtered} loading={isLoading} emptyMessage="No customers found" />
      )}
    </PageTransition>
  )
}
