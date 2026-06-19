import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/ThemeProvider"
import { MobileMenuButton } from "@/components/layout/Sidebar"
import { LogOut } from "lucide-react"

export function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="h-14 border-b border-gray-200 dark:border-gray-700 bg-card flex items-center justify-between px-4 lg:px-6 gap-2">
      <div className="flex items-center gap-2">
        <MobileMenuButton className="md:hidden" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate max-w-[160px] sm:max-w-none">
            {user?.email}
          </span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize shrink-0">
            {user?.role}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground">
          <LogOut className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  )
}
