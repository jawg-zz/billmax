import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wifi, Shield, Activity } from "lucide-react"

export function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      await login(email, password)
      navigate("/")
    } catch {
      setError("Invalid email or password")
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-600 via-primary to-cyan-500 items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="relative z-10 text-center px-12 animate-in">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-2xl mb-8">
            <Wifi className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">BillMax</h1>
          <p className="text-lg text-blue-100/80 mb-10 max-w-md mx-auto">
            Enterprise ISP Billing & Operations Platform
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
            <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 p-4 text-center">
              <Shield className="h-6 w-6 text-white mx-auto mb-2" />
              <p className="text-xs text-blue-100/70">Secure</p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 p-4 text-center">
              <Activity className="h-6 w-6 text-white mx-auto mb-2" />
              <p className="text-xs text-blue-100/70">Real-time</p>
            </div>
            <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 p-4 text-center">
              <Wifi className="h-6 w-6 text-white mx-auto mb-2" />
              <p className="text-xs text-blue-100/70">ISP Ready</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-background dark:to-background p-4 md:p-8">
        <div className="w-full max-w-md animate-in slide-in-from-right">
          <Card className="border-border/50 shadow-xl shadow-primary/5">
            <CardHeader className="text-center pt-8">
              <div className="flex justify-center mb-5">
                <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <Wifi className="h-7 w-7 text-primary-foreground" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
              <CardDescription className="text-sm">Sign in to your BillMax account</CardDescription>
            </CardHeader>
            <CardContent className="pb-8 px-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email address</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="w-full h-11 text-sm font-semibold gradient-primary hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
                  Sign in
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
