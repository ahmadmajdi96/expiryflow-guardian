import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle } from "lucide-react";

const mockBatches = [
  { batch: "B20260504-001", sku: "MILK-001", name: "Fresh Whole Milk 1L", supplier: "FreshFarms Ltd", qty: 500, status: "PENDING" },
  { batch: "B20260504-002", sku: "JUICE-02", name: "Orange Juice 500ml", supplier: "CitrusCo", qty: 200, status: "PENDING" },
  { batch: "B20260503-005", sku: "CREAM-02", name: "Heavy Cream 250ml", supplier: "DairyBest", qty: 100, status: "PASSED" },
  { batch: "B20260502-003", sku: "CHEESE-01", name: "Cheddar Slices 200g", supplier: "CheeseWorld", qty: 150, status: "FAILED" },
];

const statusBadge: Record<string, { cls: string; label: string }> = {
  PENDING: { cls: "bg-warning/10 text-warning border-warning/30", label: "Pending" },
  PASSED: { cls: "bg-success/10 text-success border-success/30", label: "Passed" },
  FAILED: { cls: "bg-destructive/10 text-destructive border-destructive/30", label: "Failed" },
};

const QCInspection = () => {
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  return (
    <>
      <PageHeader
        title="QC Inspection"
        description="Quality control sampling and inspection workflow. Batches are randomly selected for QC based on configurable sampling rules."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 page-section">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold">Inspection Queue</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 font-medium text-muted-foreground">Batch #</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Product</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Supplier</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground text-right">Qty</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {mockBatches.map((b) => (
                  <tr key={b.batch} className="table-row-hover border-b border-border/50">
                    <td className="px-5 py-3 font-mono text-xs">{b.batch}</td>
                    <td className="px-5 py-3">
                      <div className="font-medium">{b.name}</div>
                      <div className="text-xs text-muted-foreground">{b.sku}</div>
                    </td>
                    <td className="px-5 py-3">{b.supplier}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{b.qty}</td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className={statusBadge[b.status].cls}>{statusBadge[b.status].label}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      {b.status === "PENDING" && (
                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setSelectedBatch(b.batch)}>
                          Inspect
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="page-section p-5 space-y-4">
          <h3 className="font-semibold">Inspection Form</h3>
          {selectedBatch ? (
            <>
              <p className="text-sm text-muted-foreground">Batch: <span className="font-mono font-semibold">{selectedBatch}</span></p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Inspection Notes</label>
                <Textarea placeholder="Enter inspection observations…" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-success hover:bg-success/90 text-success-foreground">
                  <CheckCircle className="h-4 w-4 mr-1" /> Pass
                </Button>
                <Button variant="destructive" className="flex-1">
                  <XCircle className="h-4 w-4 mr-1" /> Fail & Quarantine
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a batch from the queue to begin inspection.</p>
          )}
        </div>
      </div>
    </>
  );
};

export default QCInspection;