import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const mockQuarantine = [
  { batch: "B20260502-003", sku: "CHEESE-01", name: "Cheddar Slices 200g", qty: 150, reason: "Temperature deviation", date: "2026-05-02", supplier: "CheeseWorld" },
  { batch: "B20260430-007", sku: "FISH-01", name: "Fresh Salmon 500g", qty: 50, reason: "Packaging damage", date: "2026-04-30", supplier: "OceanCatch" },
  { batch: "B20260428-012", sku: "CHICKEN-03", name: "Chicken Breast 1kg", qty: 80, reason: "Odor anomaly", date: "2026-04-28", supplier: "FarmFresh" },
];

const Quarantine = () => (
  <>
    <PageHeader
      title="Quarantine Management"
      description="Quarantined stock is excluded from available-for-sale, markdown proposals, and picking allocation."
      badge={<Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">{mockQuarantine.length} items</Badge>}
    />

    <div className="page-section">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-5 py-3 font-medium text-muted-foreground">Batch #</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Product</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Supplier</th>
              <th className="px-5 py-3 font-medium text-muted-foreground text-right">Qty</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Reason</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Date</th>
              <th className="px-5 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockQuarantine.map((q) => (
              <tr key={q.batch} className="table-row-hover border-b border-border/50">
                <td className="px-5 py-3 font-mono text-xs">{q.batch}</td>
                <td className="px-5 py-3">
                  <div className="font-medium">{q.name}</div>
                  <div className="text-xs text-muted-foreground">{q.sku}</div>
                </td>
                <td className="px-5 py-3">{q.supplier}</td>
                <td className="px-5 py-3 text-right tabular-nums">{q.qty}</td>
                <td className="px-5 py-3"><Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">{q.reason}</Badge></td>
                <td className="px-5 py-3 font-mono text-xs">{q.date}</td>
                <td className="px-5 py-3 space-x-1">
                  <Button variant="outline" size="sm" className="text-xs h-7">Release</Button>
                  <Button variant="outline" size="sm" className="text-xs h-7 text-destructive">Write-Off</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </>
);

export default Quarantine;