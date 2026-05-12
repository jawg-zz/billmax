import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { LogOut, User } from "lucide-react"

export function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {user?.email}
        </span>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
          {user?.role}
        </span>
      </div>
      <Button variant="ghost" size="sm" onClick={logout}>
        <LogOut className="h-4 w-4 mr-2" />
        Logout
      </Button>
    </header>
  )
}
