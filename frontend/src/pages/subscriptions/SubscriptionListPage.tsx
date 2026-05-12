import { useQuery } from "@tanstack/react-query"
import { listSubscriptions, type Subscription } from "@/services/subscriptions"
import { listPlans } from "@/services/plans"
import { listCustomers } from "@/services/customers"
import { PageHeader } from "@/components/shared/PageHeader"
import { DataTable, type Column } from "@/components/shared/DataTable"
import { StatusBadge } from "@/components/shared/StatusBadge"

export function SubscriptionListPage() {
  const { data: subs, isLoading } = useQuery({ queryKey: ["subscriptions"], queryFn: () => listSubscriptions() })
  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: () => listCustomers() })
  const { data: plans } = useQuery({ queryKey: ["plans"], queryFn: () => listPlans() })

  const custMap = new Map(customers?.map((c) => [c.id, c]))
  const planMap = new Map(plans?.map((p) => [p.id, p]))

  const columns: Column<Subscription>[] = [
    {
      key: "customer", header: "Customer",
      cell: (s) => {
        const c = custMap.get(s.customer_id)
        return c ? `${c.first_name} ${c.last_name}` : s.customer_id.slice(0, 8)
      },
    },
    {
      key: "plan", header: "Plan",
      cell: (s) => planMap.get(s.plan_id)?.name ?? s.plan_id.slice(0, 8),
    },
    { key: "status", header: "Status", cell: (s) => <StatusBadge status={s.status} /> },
    { key: "next_billing_date", header: "Next Billing" },
    { key: "provisioned", header: "Provisioned", cell: (s) => s.provisioned ? "Yes" : "No" },
  ]

  return (
    <div>
      <PageHeader title="Subscriptions" description="Customer plan assignments" />
      <DataTable columns={columns} data={subs ?? []} loading={isLoading} />
    </div>
  )
}
