import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const mockTransfers = [
  { id: "TRF-001", sku: "MILK-001", batch: "B20260420", from: "ST-01", to: "ST-02", qty: 100, status: "IN_TRANSIT", created: "2026-05-03" },
  { id: "TRF-002", sku: "YOGURT-05", batch: "B20260418", from: "ST-02", to: "ST-03", qty: 50, status: "COMPLETED", created: "2026-05-02" },
  { id: "TRF-003", sku: "BREAD-03", batch: "B20260501", from: "ST-01", to: "ST-03", qty: 80, status: "PENDING", created: "2026-05-04" },
];

const statusMap: Record<string, { cls: string; label: string }> = {
  PENDING: { cls: "bg-warning/10 text-warning border-warning/30", label: "Pending" },
  IN_TRANSIT: { cls: "bg-info/10 text-info border-info/30", label: "In Transit" },
  COMPLETED: { cls: "bg-success/10 text-success border-success/30", label: "Completed" },
};

const Transfers = () => (
  <>
    <PageHeader
      title="Stock Transfers"
      description="Manage inter-store stock movements with expiry-risk balancing."
      actions={<Button size="sm">+ New Transfer</Button>}
    />

    <div className="page-section">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-5 py-3 font-medium text-muted-foreground">Transfer ID</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">SKU / Batch</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Route</th>
              <th className="px-5 py-3 font-medium text-muted-foreground text-right">Qty</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Created</th>
            </tr>
          </thead>
          <tbody>
            {mockTransfers.map((t) => (
              <tr key={t.id} className="table-row-hover border-b border-border/50">
                <td className="px-5 py-3 font-mono text-xs font-semibold">{t.id}</td>
                <td className="px-5 py-3">
                  <div className="font-mono text-xs">{t.sku}</div>
                  <div className="text-xs text-muted-foreground">{t.batch}</div>
                </td>
                <td className="px-5 py-3">
                  <span className="font-semibold">{t.from}</span>
                  <ArrowRight className="inline h-3 w-3 mx-1 text-muted-foreground" />
                  <span className="font-semibold">{t.to}</span>
                </td>
                <td className="px-5 py-3 text-right tabular-nums">{t.qty}</td>
                <td className="px-5 py-3">
                  <Badge variant="outline" className={statusMap[t.status].cls}>{statusMap[t.status].label}</Badge>
                </td>
                <td className="px-5 py-3 font-mono text-xs">{t.created}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </>
);

export default Transfers;