import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { portalLogin } from "@/services/portal"

export function PortalLoginPage() {
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await portalLogin(phone, password)
      localStorage.setItem("portal_token", res.access_token)
      navigate("/portal")
    } catch {
      setError("Invalid phone or password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-emerald-600 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
            </div>
          </div>
          <CardTitle className="text-2xl">Customer Portal</CardTitle>
          <CardDescription>View invoices, pay bills, and raise tickets</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="2547XXXXXXXX" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Portal PIN</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your portal password" required />
            </div>
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/portal/register" className="text-emerald-600 hover:underline font-medium">
                Create one
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
