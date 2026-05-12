import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export interface Column<T> {
  key: string
  header: string
  cell?: (item: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField?: string
  loading?: boolean
  emptyMessage?: string
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField = "id",
  loading,
  emptyMessage = "No items found",
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col) => (
              <th key={col.key} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-8 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr key={item[keyField]} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3 text-sm", col.className)}>
                    {col.cell ? col.cell(item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

