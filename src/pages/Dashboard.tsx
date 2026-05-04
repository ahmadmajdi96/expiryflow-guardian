import PageHeader from "@/components/PageHeader";
import { Package, AlertTriangle, Clock, ShieldAlert, TrendingDown, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const stats = [
  { label: "Total Batches", value: "2,847", icon: Package, trend: "+12 today" },
  { label: "Near-Expiry Items", value: "156", icon: AlertTriangle, trend: "↑ 8 from yesterday", alert: true },
  { label: "Avg. Days to Expiry", value: "18.3", icon: Clock, trend: "Across active stock" },
  { label: "Quarantined", value: "23", icon: ShieldAlert, trend: "3 pending review" },
  { label: "Markdowns Active", value: "47", icon: TrendingDown, trend: "₹12.4K value" },
  { label: "FEFO Compliance", value: "99.2%", icon: CheckCircle, trend: "Last 30 days" },
];

const recentAlerts = [
  { sku: "MILK-001", batch: "B20260420", store: "ST-01", qty: 450, expiry: "2026-05-15", days: 11, zone: "ORANGE" },
  { sku: "JUICE-02", batch: "B20260415", store: "ST-03", qty: 120, expiry: "2026-05-10", days: 6, zone: "RED" },
  { sku: "BREAD-03", batch: "B20260501", store: "ST-01", qty: 300, expiry: "2026-05-09", days: 5, zone: "RED" },
  { sku: "YOGURT-05", batch: "B20260418", store: "ST-02", qty: 200, expiry: "2026-05-20", days: 16, zone: "YELLOW" },
  { sku: "CHEESE-01", batch: "B20260410", store: "ST-01", qty: 85, expiry: "2026-05-08", days: 4, zone: "RED" },
];

const zoneClass: Record<string, string> = {
  GREEN: "zone-green", YELLOW: "zone-yellow", ORANGE: "zone-orange", RED: "zone-red", BLACK: "zone-black"
};
const zoneEmoji: Record<string, string> = {
  GREEN: "🟢", YELLOW: "🟡", ORANGE: "🟠", RED: "🔴", BLACK: "⚫"
};

const Dashboard = () => (
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
              <tr key={a.batch} className="table-row-hover border-b border-border/50">
                <td className="px-5 py-3 font-mono text-xs">{a.sku}</td>
                <td className="px-5 py-3 font-mono text-xs">{a.batch}</td>
                <td className="px-5 py-3">{a.store}</td>
                <td className="px-5 py-3 text-right tabular-nums">{a.qty}</td>
                <td className="px-5 py-3 font-mono text-xs">{a.expiry}</td>
                <td className="px-5 py-3 text-right tabular-nums font-semibold">{a.days}</td>
                <td className="px-5 py-3">
                  <span className={`pill ${zoneClass[a.zone]}`}>{zoneEmoji[a.zone]} {a.zone}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </>
);

export default Dashboard;