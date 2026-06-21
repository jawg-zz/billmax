import { useMemo, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react"

export interface Column<T> {
  key: string
  header: string
  cell?: (item: T) => ReactNode
  className?: string
  sortable?: boolean
  sortValue?: (item: T) => string | number
  hideOnMobile?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField?: string
  loading?: boolean
  emptyMessage?: string
  pageSize?: number
  onRowClick?: (item: T) => void
  responsive?: boolean
  minWidth?: string
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField = "id",
  loading,
  emptyMessage = "No items found",
  pageSize = 20,
  onRowClick,
  responsive = true,
  minWidth,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)

  const sorted = useMemo(() => {
    if (!sortKey) return data
    const col = columns.find((c) => c.key === sortKey)
    return [...data].sort((a, b) => {
      const getVal = col?.sortValue ?? ((item: any) => item[sortKey] ?? "")
      const va = getVal(a)
      const vb = getVal(b)
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb))
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [data, sortKey, sortDir, columns])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
    setPage(1)
  }

  if (loading) {
    return (
      <div className="rounded-md border overflow-hidden">
        <div className="border-b bg-muted/50 p-3">
          <div className="flex gap-4">
            {columns.map((col) => (
              <div key={col.key} className="h-4 flex-1 bg-muted/60 rounded animate-pulse" />
            ))}
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, r) => (
          <div key={r} className="border-b last:border-0 p-3">
            <div className="flex gap-4">
              {columns.map((col) => (
                <div key={col.key} className="h-4 flex-1 bg-muted/60 rounded animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-hidden bg-card">
      <div className={cn("overflow-x-auto relative", responsive && "-mx-3 md:mx-0")}>
        <table className="w-full" style={minWidth ? { minWidth } : undefined}>
          <thead>
            <tr className="border-b bg-muted/50 sticky top-0 z-10">
              {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap",
                      col.sortable && "cursor-pointer select-none hover:bg-muted/80 transition-colors",
                      col.hideOnMobile && "hidden md:table-cell",
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && (
                      <span className="text-muted-foreground/50">
                        {sortKey === col.key ? (
                          sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginated.map((item, idx) => (
                <tr
                  key={item[keyField]}
                  className={cn(
                    "border-b border-border/50 last:border-0 transition-colors",
                    idx % 2 === 0 && "bg-muted/20",
                    "hover:bg-muted/40",
                    onRowClick && "cursor-pointer",
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3 text-sm", col.className, col.hideOnMobile && "hidden md:table-cell")}>
                      {col.cell ? col.cell(item) : item[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > pageSize && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-3 md:px-4 py-3 border-t bg-muted/30 text-sm gap-2">
          <span className="hidden sm:inline text-muted-foreground">
            {sorted.length} result{sorted.length !== 1 ? "s" : ""}
            {pageSize < sorted.length && (
              <> · showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)}</>
            )}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              let pageNum: number
              if (totalPages <= 7) {
                pageNum = i + 1
              } else if (page <= 4) {
                pageNum = i + 1
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i
              } else {
                pageNum = page - 3 + i
              }
              return (
                <button
                  key={pageNum}
                  className={cn(
                    "px-1.5 md:px-2.5 py-0.5 md:py-1 rounded text-sm font-medium transition-colors",
                    page === pageNum
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground",
                  )}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
