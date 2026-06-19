import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/ThemeProvider"
import { MobileMenuButton } from "@/components/layout/Sidebar"
import { LogOut } from "lucide-react"

export function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-6 gap-2 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <MobileMenuButton className="md:hidden" />
        <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="text-foreground font-medium">Dashboard</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {user && (
          <div className="hidden sm:flex items-center gap-2 mr-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="text-right">
              <p className="text-xs font-medium leading-tight">{user.email}</p>
              <p className="text-[10px] text-muted-foreground capitalize leading-tight">{user.role}</p>
            </div>
          </div>
        )}
        <ThemeToggle />
        <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive hover:bg-destructive/5">
          <LogOut className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  )
}
