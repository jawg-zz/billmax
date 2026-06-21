import { useState, useMemo } from "react"

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split("T")[0]
}

function startOfQuarter(): string {
  const d = new Date()
  const m = Math.floor(d.getMonth() / 3) * 3
  return new Date(d.getFullYear(), m, 1).toISOString().split("T")[0]
}

function startOfYear(): string {
  return new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0]
}

export interface DatePreset {
  label: string
  from: string
  to: string
}

const presets: DatePreset[] = [
  { label: "Last 30 days", from: daysAgo(30), to: daysAgo(0) },
  { label: "This Quarter", from: startOfQuarter(), to: daysAgo(0) },
  { label: "This Year", from: startOfYear(), to: daysAgo(0) },
  { label: "All Time", from: "", to: "" },
]

export function useDateRange() {
  const [range, setRange] = useState<{ from: string; to: string }>({ from: "", to: "" })

  const params = useMemo(() => {
    const p: Record<string, string> = {}
    if (range.from) p.from_date = range.from
    if (range.to) p.to_date = range.to
    return p
  }, [range])

  return { range, setRange, params, presets }
}
