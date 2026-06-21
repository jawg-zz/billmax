import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color: string
  subtitle?: string
  trend?: "up" | "down" | "neutral"
  trendValue?: string
}

const gradientMap: Record<string, string> = {
  "text-blue-600": "from-blue-500 to-blue-600",
  "text-green-600": "from-emerald-400 to-emerald-600",
  "text-orange-600": "from-orange-400 to-orange-600",
  "text-emerald-600": "from-emerald-400 to-emerald-600",
  "text-purple-600": "from-purple-400 to-purple-600",
  "text-sky-600": "from-sky-400 to-sky-600",
}

export function StatsCard({ title, value, icon: Icon, color, subtitle, trend, trendValue }: StatsCardProps) {
  const gradient = gradientMap[color] || "from-blue-500 to-blue-600"

  return (
    <Card className="card-hover border-border/50 bg-card overflow-hidden">
      <CardContent className="p-3 md:p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="stats-label">{title}</p>
            <p className="stats-value">{value}</p>
            {(subtitle || trend) && (
              <div className="flex items-center gap-2">
                {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
                {trend && (
                  <span className={cn(
                    "inline-flex items-center gap-0.5 text-xs font-semibold",
                    trend === "up" && "text-emerald-500",
                    trend === "down" && "text-red-500",
                    trend === "neutral" && "text-muted-foreground",
                  )}>
                    {trend === "up" && <TrendingUp className="h-3 w-3" />}
                    {trend === "down" && <TrendingDown className="h-3 w-3" />}
                    {trendValue}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className={cn("flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm", gradient)}>
            <Icon className="h-4 w-4 md:h-5 md:w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
