export const API_BASE = "/api/v1"

export const STATUS_VARIANTS: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  active: "success",
  paid: "success",
  completed: "success",
  sent: "secondary",
  draft: "secondary",
  pending: "warning",
  overdue: "destructive",
  suspended: "destructive",
  failed: "destructive",
  cancelled: "destructive",
}

export const PLAN_TYPES = [
  { value: "fiber", label: "Fiber" },
  { value: "wireless", label: "Wireless" },
  { value: "lte", label: "LTE" },
  { value: "leased_line", label: "Leased Line" },
]

export const BILLING_CYCLES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "biannually", label: "Bi-annually" },
  { value: "yearly", label: "Yearly" },
]
