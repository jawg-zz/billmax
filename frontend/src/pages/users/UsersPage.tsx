import { useQuery } from "@tanstack/react-query"
import { listUsers, type AppUser } from "@/services/users"
import { PageHeader } from "@/components/shared/PageHeader"
import { PageTransition } from "@/components/shared/PageTransition"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/ui/EmptyState"
import { Shield } from "lucide-react"

const columns: Column<AppUser>[] = [
  { key: "email", header: "Email", sortable: true },
  {
    key: "role", header: "Role", sortable: true,
    cell: (u) => <StatusBadge status={u.role} />,
  },
  {
    key: "phone", header: "Phone",
    cell: (u) => u.phone ?? <span className="text-muted-foreground">—</span>,
  },
  {
    key: "is_active", header: "Status", sortable: true,
    sortValue: (u) => u.is_active ? 1 : 0,
    cell: (u) => u.is_active
      ? <span className="inline-flex items-center gap-1 text-green-600"><span className="h-1.5 w-1.5 rounded-full bg-green-600" />Active</span>
      : <span className="text-muted-foreground">Inactive</span>,
  },
  {
    key: "is_superuser", header: "Admin",
    cell: (u) => u.is_superuser ? <span className="text-primary font-medium">Yes</span> : "No",
  },
  {
    key: "is_verified", header: "Verified",
    cell: (u) => u.is_verified
      ? <span className="text-green-600">Yes</span>
      : <span className="text-muted-foreground">No</span>,
  },
]

export function UsersPage() {
  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => listUsers() })

  return (
    <PageTransition>
      <PageHeader title="Staff Users" description={`${data?.length ?? 0} system users`} />

      {!isLoading && (data ?? []).length === 0 ? (
        <EmptyState
          icon={<Shield className="h-12 w-12" />}
          title="No staff users"
          description="Staff users can be added through the admin panel"
        />
      ) : (
        <DataTable columns={columns} data={data ?? []} loading={isLoading} emptyMessage="No users found" pageSize={50} />
      )}
    </PageTransition>
  )
}
