import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, FileText } from "lucide-react"
import api from "@/services/api"

interface PdfViewerProps {
  invoiceId: string
  invoiceNumber: string
  children?: React.ReactNode
}

export function PdfViewer({ invoiceId, invoiceNumber, children }: PdfViewerProps) {
  const [open, setOpen] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const loadPdf = async () => {
    setOpen(true)
    setLoading(true)
    setError("")
    try {
      const res = await api.get(`/invoices/${invoiceId}/pdf`, {
        responseType: "blob",
      })
      const url = URL.createObjectURL(res.data)
      setPdfUrl(url)
    } catch {
      setError("Failed to load PDF")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <span onClick={loadPdf} className="cursor-pointer">{children}</span>
      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); if (pdfUrl) URL.revokeObjectURL(pdfUrl); setPdfUrl(null) } }}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Invoice {invoiceNumber}</DialogTitle>
            {pdfUrl && (
              <Button variant="outline" size="sm" onClick={() => {
                const a = document.createElement("a")
                a.href = pdfUrl
                a.download = `Invoice_${invoiceNumber}.pdf`
                a.click()
              }}>
                <FileText className="h-4 w-4 mr-2" />Download
              </Button>
            )}
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {loading && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {error && (
              <div className="flex items-center justify-center h-full text-destructive">{error}</div>
            )}
            {pdfUrl && (
              <embed src={pdfUrl} type="application/pdf" className="w-full h-full rounded border" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
