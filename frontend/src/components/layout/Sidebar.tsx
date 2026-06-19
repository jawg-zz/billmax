import { useState } from "react"
import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, Radio, Receipt,
  Wifi, Phone, Ticket, Shield, BarChart3, Activity,
  Menu, X,
} from "lucide-react"

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "billing", "support", "tech"] },
  { to: "/customers", label: "Customers", icon: Users, roles: ["admin", "billing", "support", "tech"] },
  { to: "/plans", label: "Plans", icon: Radio, roles: ["admin", "billing"] },
  { to: "/subscriptions", label: "Subscriptions", icon: Wifi, roles: ["admin", "billing", "support", "tech"] },
  { to: "/invoices", label: "Invoices", icon: Receipt, roles: ["admin", "billing"] },
  { to: "/mpesa", label: "M-Pesa", icon: Phone, roles: ["admin", "billing"] },
  { to: "/tickets", label: "Tickets", icon: Ticket, roles: ["admin", "support"] },
  { to: "/usage", label: "Usage", icon: Activity, roles: ["admin", "billing", "tech"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["admin", "billing"] },
  { to: "/users", label: "Users", icon: Shield, roles: ["admin"] },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-primary">BillMax</h1>
        <p className="text-xs text-muted-foreground">ISP Billing System</p>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-muted-foreground">BillMax v0.1.0</p>
      </div>
    </>
  )
}

export function Sidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col border-r border-gray-200 dark:border-gray-700 bg-card">
        <SidebarContent />
      </aside>
    </>
  )
}

export function MobileMenuButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className={cn("p-2 rounded-md hover:bg-accent transition-colors", className)}
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed left-0 top-0 bottom-0 w-72 bg-card border-r border-gray-200 dark:border-gray-700 flex flex-col shadow-xl animate-in slide-in-from-left">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h1 className="text-lg font-bold text-primary">BillMax</h1>
                <p className="text-xs text-muted-foreground">ISP Billing System</p>
              </div>
              <button
                className="p-1.5 rounded-md hover:bg-accent transition-colors"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-muted-foreground">BillMax v0.1.0</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
