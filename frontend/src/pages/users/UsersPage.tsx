import { useQuery } from "@tanstack/react-query"
import { listUsers, type AppUser } from "@/services/users"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"

const columns: Column<AppUser>[] = [
  { key: "email", header: "Email" },
  { key: "role", header: "Role", cell: (u) => <StatusBadge status={u.role} /> },
  { key: "phone", header: "Phone", cell: (u) => u.phone ?? "—" },
  { key: "is_active", header: "Status", cell: (u) => u.is_active ? "Active" : "Inactive" },
  { key: "is_superuser", header: "Admin", cell: (u) => u.is_superuser ? "Yes" : "No" },
  { key: "is_verified", header: "Verified", cell: (u) => u.is_verified ? "Yes" : "No" },
]

export function UsersPage() {
  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => listUsers() })

  return (
    <div>
      <PageHeader title="Staff Users" description="Manage system users and roles" />
      <DataTable columns={columns} data={data ?? []} loading={isLoading} emptyMessage="No users found" />
    </div>
  )
}
