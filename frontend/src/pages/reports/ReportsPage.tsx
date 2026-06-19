import { useState, lazy, Suspense } from "react"
import { PageHeader } from "@/components/shared/PageHeader"
import { PageTransition } from "@/components/shared/PageTransition"
import { Skeleton } from "@/components/ui/Skeleton"

const RevenueTab = lazy(() => import("./RevenueTab"))
const CollectionsTab = lazy(() => import("./CollectionsTab"))
const CustomersTab = lazy(() => import("./CustomersTab"))
const PlansTab = lazy(() => import("./PlansTab"))
const TaxTab = lazy(() => import("./TaxTab"))

const tabs = [
  { key: "revenue", label: "Revenue" },
  { key: "collections", label: "Collections" },
  { key: "customers", label: "Customers" },
  { key: "plans", label: "Plans" },
  { key: "tax", label: "Tax (VAT)" },
]

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState("revenue")

  const tabComponents: Record<string, React.FC> = {
    revenue: RevenueTab,
    collections: CollectionsTab,
    customers: CustomersTab,
    plans: PlansTab,
    tax: TaxTab,
  }
  const ActiveComponent = tabComponents[activeTab]

  return (
    <PageTransition>
      <PageHeader title="Reports" description="Business analytics and tax summaries" />
      <div className="flex gap-1 mb-6 border-b pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTab === t.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Suspense fallback={<div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>}>
        <ActiveComponent />
      </Suspense>
    </PageTransition>
  )
}
