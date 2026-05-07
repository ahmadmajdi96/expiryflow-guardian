import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Package, AlertTriangle, Clock, ShieldAlert, TrendingDown, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { useAuth } from "@/hooks/useAuth";

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

type EnrichedBatch = any & { daysLeft: number; zone: string };

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: batches } = useQuery({
    queryKey: ["dashboard-batches", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("inventory_batches")
        .select("*, products(sku, name), stores(store_code)")
        .eq("status", "AVAILABLE")
        .order("expiry_date", { ascending: true });
      return data ?? [];
    },
    enabled: !!user,
    refetchInterval: 300000, // 5 min auto-refresh
  });

  const { data: quarantinedCount } = useQuery({
    queryKey: ["dashboard-quarantined", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("inventory_batches")
        .select("*", { count: "exact", head: true })
        .eq("status", "QUARANTINED");
      return count ?? 0;
    },
    enabled: !!user,
  });

  const { data: proposalCount } = useQuery({
    queryKey: ["dashboard-proposals", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("markdown_proposals")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "approved"]);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const today = new Date();
  const enriched: EnrichedBatch[] = (batches ?? []).map((b) => {
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
    { label: "FEFO Compliance", value: enriched.length > 0 ? `${Math.max(0, Math.round(((enriched.length - nearExpiry.length) / enriched.length) * 100))}%` : "N/A", icon: CheckCircle, trend: "Batches in green/yellow zone" },
  ];

  const recentAlerts = enriched.filter((b) => b.zone !== "GREEN");

  const columns: DataTableColumn<EnrichedBatch>[] = [
    { key: "sku", header: "SKU", accessor: (r) => r.products?.sku, sortable: true, filter: "text", cell: (r) => <span className="font-mono text-xs">{r.products?.sku}</span> },
    { key: "batch_number", header: "Batch #", accessor: (r) => r.batch_number, sortable: true, filter: "text", cell: (r) => <span className="font-mono text-xs">{r.batch_number}</span> },
    { key: "store", header: "Store", accessor: (r) => r.stores?.store_code, sortable: true, filter: "select" },
    { key: "quantity", header: "Qty", accessor: (r) => r.quantity, sortable: true, align: "right", cell: (r) => <span className="tabular-nums">{r.quantity}</span> },
    { key: "expiry_date", header: "Expiry", accessor: (r) => r.expiry_date, sortable: true, filter: "date", cell: (r) => <span className="font-mono text-xs">{r.expiry_date}</span> },
    { key: "daysLeft", header: "Days Left", accessor: (r) => r.daysLeft, sortable: true, align: "right", cell: (r) => <span className="tabular-nums font-semibold">{r.daysLeft}</span> },
    { key: "zone", header: "Zone", accessor: (r) => r.zone, filter: "select", cell: (r) => <span className={`pill ${zoneClass[r.zone]}`}>{zoneEmoji[r.zone]} {r.zone}</span> },
  ];

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

      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold text-lg">Recent Expiry Alerts</h2>
          <p className="text-sm text-muted-foreground">Items entering warning zones across all stores</p>
        </div>
        <Link to="/expiry-alerts" className="text-xs text-primary hover:underline whitespace-nowrap">View all →</Link>
      </div>
      <DataTable
        rows={recentAlerts}
        columns={columns}
        rowKey={(r) => r.id}
        exportFilename="dashboard-alerts"
        tableId="dash-alerts"
        onRowClick={(r) => navigate(`/batch/${r.id}`)}
        emptyMessage="No alerts — all stock in green zone"
        pageSize={10}
      />
    </>
  );
};

export default Dashboard;