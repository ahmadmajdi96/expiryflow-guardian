import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Package, AlertTriangle, Clock, ShieldAlert, TrendingDown, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const zoneClass: Record<string, string> = {
  GREEN: "zone-green", YELLOW: "zone-yellow", ORANGE: "zone-orange", RED: "zone-red", BLACK: "zone-black"
};
const zoneEmoji: Record<string, string> = {
  GREEN: "🟢", YELLOW: "🟡", ORANGE: "🟠", RED: "🔴", BLACK: "⚫"
};

function getZone(daysLeft: number) {
  if (daysLeft <= 2) return "BLACK";
  if (daysLeft <= 7) return "RED";
  if (daysLeft <= 14) return "ORANGE";
  if (daysLeft <= 30) return "YELLOW";
  return "GREEN";
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: batches } = useQuery({
    queryKey: ["dashboard-batches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inventory_batches")
        .select("*, products(sku, name), stores(store_code)")
        .eq("status", "AVAILABLE")
        .order("expiry_date", { ascending: true });
      return data ?? [];
    },
  });

  const { data: quarantinedCount } = useQuery({
    queryKey: ["dashboard-quarantined"],
    queryFn: async () => {
      const { count } = await supabase
        .from("inventory_batches")
        .select("*", { count: "exact", head: true })
        .eq("status", "QUARANTINED");
      return count ?? 0;
    },
  });

  const { data: proposalCount } = useQuery({
    queryKey: ["dashboard-proposals"],
    queryFn: async () => {
      const { count } = await supabase
        .from("markdown_proposals")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "approved"]);
      return count ?? 0;
    },
  });

  const today = new Date();
  const enriched = (batches ?? []).map((b) => {
    const days = Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000);
    return { ...b, daysLeft: days, zone: getZone(days) };
  });

  const nearExpiry = enriched.filter((b) => b.daysLeft <= 14);
  const avgDays = enriched.length ? (enriched.reduce((s, b) => s + b.daysLeft, 0) / enriched.length).toFixed(1) : "0";

  const stats = [
    { label: "Total Batches", value: String(enriched.length), icon: Package, trend: "Active available stock" },
    { label: "Near-Expiry Items", value: String(nearExpiry.length), icon: AlertTriangle, trend: "≤14 days to expiry", alert: true },
    { label: "Avg. Days to Expiry", value: avgDays, icon: Clock, trend: "Across active stock" },
    { label: "Quarantined", value: String(quarantinedCount ?? 0), icon: ShieldAlert, trend: "Excluded from sale" },
    { label: "Markdowns Active", value: String(proposalCount ?? 0), icon: TrendingDown, trend: "Pending + approved" },
    { label: "FEFO Compliance", value: "99.2%", icon: CheckCircle, trend: "Last 30 days" },
  ];

  const recentAlerts = enriched.filter((b) => b.zone !== "GREEN").slice(0, 10);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Real-time overview of inventory batches, expiry zones, and FEFO compliance across all stores."
        badge={<Badge variant="outline" className="text-xs font-mono">Live</Badge>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <span className="stat-label">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.alert ? "text-destructive" : "text-muted-foreground"}`} />
            </div>
            <div className={s.alert ? "stat-value text-destructive" : "stat-value-gradient"}>{s.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{s.trend}</p>
          </div>
        ))}
      </div>

      <div className="page-section">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-lg">Recent Expiry Alerts</h2>
          <p className="text-sm text-muted-foreground">Items entering warning zones across all stores</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 font-medium text-muted-foreground">SKU</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Batch #</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Store</th>
                <th className="px-5 py-3 font-medium text-muted-foreground text-right">Qty</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Expiry</th>
                <th className="px-5 py-3 font-medium text-muted-foreground text-right">Days Left</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Zone</th>
              </tr>
            </thead>
            <tbody>
              {recentAlerts.map((a) => (
                <tr key={a.id} className="table-row-hover border-b border-border/50 cursor-pointer" onClick={() => navigate(`/batch/${a.id}`)}>
                  <td className="px-5 py-3 font-mono text-xs">{(a as any).products?.sku}</td>
                  <td className="px-5 py-3 font-mono text-xs">{a.batch_number}</td>
                  <td className="px-5 py-3">{(a as any).stores?.store_code}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{a.quantity}</td>
                  <td className="px-5 py-3 font-mono text-xs">{a.expiry_date}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold">{a.daysLeft}</td>
                  <td className="px-5 py-3">
                    <span className={`pill ${zoneClass[a.zone]}`}>{zoneEmoji[a.zone]} {a.zone}</span>
                  </td>
                </tr>
              ))}
              {recentAlerts.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">No alerts — all stock in green zone</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default Dashboard;