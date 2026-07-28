import { useState } from "react"
import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, Radio, Receipt,
  Wifi, Phone, Ticket, Shield, BarChart3, Activity, Package,
  Menu, X, Settings,
} from "lucide-react"

const navSections = [
  {
    label: null,
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "billing", "support", "tech"] },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/customers", label: "Customers", icon: Users, roles: ["admin", "billing", "support", "tech"] },
      { to: "/plans", label: "Plans", icon: Radio, roles: ["admin", "billing"] },
      { to: "/subscriptions", label: "Subscriptions", icon: Wifi, roles: ["admin", "billing", "support", "tech"] },
      { to: "/usage", label: "Usage", icon: Activity, roles: ["admin", "billing", "tech"] },
      { to: "/inventory", label: "Inventory", icon: Package, roles: ["admin", "billing", "tech"] },
    ],
  },
  {
    label: "Billing",
    items: [
      { to: "/invoices", label: "Invoices", icon: Receipt, roles: ["admin", "billing"] },
      { to: "/mpesa", label: "M-Pesa", icon: Phone, roles: ["admin", "billing"] },
    ],
  },
  {
    label: "Support",
    items: [
      { to: "/tickets", label: "Tickets", icon: Ticket, roles: ["admin", "support"] },
    ],
  },
  {
    label: "Admin",
    items: [
      { to: "/reports", label: "Reports", icon: BarChart3, roles: ["admin", "billing"] },
      { to: "/users", label: "Users", icon: Shield, roles: ["admin"] },
      { to: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
    ],
  },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/20">
          <Wifi className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">BillMax</h1>
          <p className="text-[10px] text-blue-200/70 font-medium tracking-wider uppercase">ISP Billing System</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navSections.map((section) => (
          <div key={section.label ?? "first"}>
            {section.label && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-blue-300/50">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-blue-600/20 text-white shadow-sm border-l-2 border-blue-400"
                        : "text-blue-200/70 hover:text-white hover:bg-white/5",
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-[11px] font-bold text-white shadow-md">
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Admin User</p>
            <p className="text-[10px] text-blue-200/50 truncate">admin@billmax.ke</p>
          </div>
        </div>
      </div>
    </>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 flex-col fixed left-0 top-0 bottom-0 z-30 bg-gray-900 dark:bg-black/40 dark:backdrop-blur-xl border-r border-white/5 shadow-2xl">
      <SidebarContent />
    </aside>
  )
}

export function MobileMenuButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className={cn("p-2 rounded-lg hover:bg-accent transition-colors", className)}
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="fixed left-0 top-0 bottom-0 w-72 bg-gray-900 flex flex-col shadow-2xl border-r border-white/5 animate-in slide-in-from-left">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400">
                  <Wifi className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-white">BillMax</h1>
                  <p className="text-[9px] text-blue-200/70">ISP Billing System</p>
                </div>
              </div>
              <button
                className="p-1.5 rounded-lg text-blue-200/70 hover:text-white hover:bg-white/5 transition-colors"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
