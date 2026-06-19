import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color: string
  subtitle?: string
  trend?: "up" | "down" | "neutral"
  trendValue?: string
}

export function StatsCard({ title, value, icon: Icon, color, subtitle, trend, trendValue }: StatsCardProps) {
  return (
    <Card className="transition-all hover:shadow-md hover:-translate-y-0.5 duration-200">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`p-1.5 rounded-md bg-${color?.replace("text-", "")}/10 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend && (
              <span className={`text-xs font-medium ${
                trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-muted-foreground"
              }`}>
                {trendValue}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
