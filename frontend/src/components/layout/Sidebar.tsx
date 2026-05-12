import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, Radio, Receipt,
  Wifi, Phone, Ticket, Shield,
} from "lucide-react"

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "billing", "support", "tech"] },
  { to: "/customers", label: "Customers", icon: Users, roles: ["admin", "billing", "support", "tech"] },
  { to: "/plans", label: "Plans", icon: Radio, roles: ["admin", "billing"] },
  { to: "/subscriptions", label: "Subscriptions", icon: Wifi, roles: ["admin", "billing", "support", "tech"] },
  { to: "/invoices", label: "Invoices", icon: Receipt, roles: ["admin", "billing"] },
  { to: "/mpesa", label: "M-Pesa", icon: Phone, roles: ["admin", "billing"] },
  { to: "/tickets", label: "Tickets", icon: Ticket, roles: ["admin", "support"] },
  { to: "/users", label: "Users", icon: Shield, roles: ["admin"] },
]

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 flex-col border-r bg-card">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-primary">BillMax</h1>
        <p className="text-xs text-muted-foreground">ISP Billing System</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground">BillMax v0.1.0</p>
      </div>
    </aside>
  )
}
