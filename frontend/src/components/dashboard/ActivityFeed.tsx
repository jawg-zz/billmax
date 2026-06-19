import { CreditCard, FileText, UserPlus, AlertTriangle, type LucideIcon } from "lucide-react"

interface ActivityEvent {
  type: string
  description: string
  customer_name: string
  amount: number | null
  timestamp: string
}

const iconMap: Record<string, LucideIcon> = {
  payment_received: CreditCard,
  invoice_created: FileText,
  subscription_created: UserPlus,
}

const bgColorMap: Record<string, string> = {
  payment_received: "bg-emerald-500/15 text-emerald-500",
  invoice_created: "bg-blue-500/15 text-blue-500",
  subscription_created: "bg-purple-500/15 text-purple-500",
}



interface ActivityFeedProps {
  items: ActivityEvent[]
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No recent activity</p>
  }

  return (
    <div className="relative">
      <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" />
      <div className="space-y-0">
        {items.map((item, i) => {
          const Icon = iconMap[item.type] || AlertTriangle
          const bgColor = bgColorMap[item.type] || "bg-muted text-muted-foreground"
          return (
            <div key={i} className="relative flex items-start gap-4 pb-4 last:pb-0">
              <div className="relative z-10 flex shrink-0">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${bgColor} shadow-sm`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="min-w-0 flex-1 pt-1.5">
                <p className="text-sm">
                  <span className="font-semibold text-foreground">{item.customer_name}</span>
                  <span className="text-muted-foreground"> {item.description}</span>
                  {item.amount ? <span className="font-semibold text-foreground"> KES {item.amount.toLocaleString()}</span> : null}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(item.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  {" "}
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
