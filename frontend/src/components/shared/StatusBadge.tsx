import { Badge } from "@/components/ui/badge"
import { STATUS_VARIANTS } from "@/lib/constants"

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variant = STATUS_VARIANTS[status] ?? "secondary"
  return <Badge variant={variant}>{status}</Badge>
}
