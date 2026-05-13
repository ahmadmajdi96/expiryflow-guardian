import { ReactNode, useState } from "react";
import { NavLink, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Boxes, LayoutDashboard, AlertTriangle, ScanBarcode, ClipboardCheck,
  ArrowRightLeft, Settings, LogOut, Shield, Tag, PackageSearch, ScrollText,
  Package, Store, Users, Menu, ArrowDownToLine, ArrowUpFromLine, TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import WMSAssistantChat from "@/components/WMSAssistantChat";

type NavItem = { to: string; label: string; icon: any };
type NavSection = { label: string; items: NavItem[] };

const sections: NavSection[] = [
  {
    label: "Operations",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/expiry-alerts", label: "Expiry Alerts", icon: AlertTriangle },
      { to: "/receiving", label: "Receiving & Putaway", icon: ScanBarcode },
      { to: "/pick-requests", label: "Pick Requests", icon: PackageSearch },
      { to: "/markdown-approvals", label: "Markdown Approvals", icon: Tag },
      { to: "/inbound-orders", label: "Inbound Orders", icon: ArrowDownToLine },
      { to: "/outbound-orders", label: "Outbound Orders", icon: ArrowUpFromLine },
      { to: "/forecast", label: "AI Forecast", icon: TrendingUp },
    ],
  },
  {
    label: "Quality & Logistics",
    items: [
      { to: "/qc-inspection", label: "QC Inspection", icon: ClipboardCheck },
      { to: "/quarantine", label: "Quarantine", icon: Shield },
      { to: "/transfers", label: "Stock Transfers", icon: ArrowRightLeft },
    ],
  },
  {
    label: "Configuration",
    items: [
      { to: "/settings", label: "Alert Settings", icon: Settings },
      { to: "/webhook-log", label: "Webhook Log", icon: ScrollText },
      { to: "/products", label: "Products", icon: Package },
      { to: "/stores", label: "Stores", icon: Store },
      { to: "/users", label: "Users", icon: Users },
    ],
  },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, loading, signOut } = useAuth();
  const { canAccess, roles, loading: rolesLoading } = useRole();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  if (loading || rolesLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;

  return (
    <div className="min-h-screen flex bg-background">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col fixed inset-y-0 left-0 z-30 transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-md" style={{ background: "var(--gradient-primary)", color: "hsl(var(--primary-foreground))" }}>
            <Boxes className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold tracking-tight text-sidebar-foreground">CORTA</div>
            <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "hsl(var(--sidebar-muted))" }}>ExpirySmart WMS</div>
          </div>
        </div>

        <nav className="flex-1 py-3 px-3 overflow-y-auto min-h-0">
          {sections.map((sec) => (
            <div key={sec.label}>
              <div className="nav-section-label">{sec.label}</div>
              <div className="space-y-0.5">
                {sec.items.filter(({ to }) => canAccess(to)).map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/"}
                    className={({ isActive }) => cn("nav-link group", isActive && "nav-link-active")}
                  >
                    <Icon className="nav-icon h-4 w-4 shrink-0 transition-colors" style={{ color: "hsl(var(--sidebar-muted))" }} />
                    <span className="truncate">{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-1.5">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-sidebar-accent/60 border border-sidebar-border/50">
            <div className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 shadow-sm" style={{ background: "var(--gradient-primary)", color: "hsl(var(--primary-foreground))" }}>
              {user.email?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate text-sidebar-foreground">{user.email}</div>
              <div className="text-[10px] truncate capitalize" style={{ color: "hsl(var(--sidebar-muted))" }}>{roles.length > 0 ? roles.map(r => r.replace(/_/g, " ")).join(", ") : "No role"}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            style={{ color: "hsl(var(--sidebar-muted))" }}
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-auto lg:ml-64" style={{ background: "var(--gradient-hero)" }}>
        <div className="lg:hidden sticky top-0 z-10 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)} className="p-1"><Menu className="h-5 w-5" /></Button>
          <span className="font-bold text-sm">CORTA WMS</span>
        </div>
        <div className="px-4 py-4 lg:px-8 lg:py-6 max-w-[1600px] mx-auto animate-fade-in">{children}</div>
      </main>
      <WMSAssistantChat />
    </div>
  );
};

export default AppLayout;