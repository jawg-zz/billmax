import { cn } from "@/lib/utils"
import { STATUS_VARIANTS } from "@/lib/constants"

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const variant = STATUS_VARIANTS[status] || "secondary"
  const dotColors: Record<string, string> = {
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
    secondary: "bg-muted-foreground/40",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        variant === "success" && "bg-success/10 text-success",
        variant === "warning" && "bg-warning/10 text-warning",
        variant === "destructive" && "bg-destructive/10 text-destructive",
        variant === "secondary" && "bg-muted text-muted-foreground",
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[variant] || "bg-muted-foreground/40")} />
      {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
    </span>
  )
}
