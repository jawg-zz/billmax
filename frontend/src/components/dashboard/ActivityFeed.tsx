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

const colorMap: Record<string, string> = {
  payment_received: "text-green-600",
  invoice_created: "text-blue-600",
  subscription_created: "text-purple-600",
}

interface ActivityFeedProps {
  items: ActivityEvent[]
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
  }

  return (
    <div className="space-y-0">
      {items.map((item, i) => {
        const Icon = iconMap[item.type] || AlertTriangle
        const color = colorMap[item.type] || "text-muted-foreground"
        return (
          <div key={i} className="flex items-start gap-3 py-2.5 border-b last:border-0">
            <Icon className={`h-4 w-4 mt-0.5 ${color} shrink-0`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">{item.customer_name}</span>
                {" "}{item.description}
                {item.amount ? <span className="font-medium"> KES {item.amount.toLocaleString()}</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
