import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const statusBadge: Record<string, { cls: string; label: string }> = {
  PENDING: { cls: "bg-warning/10 text-warning border-warning/30", label: "Pending" },
  PASSED: { cls: "bg-success/10 text-success border-success/30", label: "Passed" },
  FAILED: { cls: "bg-destructive/10 text-destructive border-destructive/30", label: "Failed" },
};

const QCInspection = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const { data: batches, isLoading } = useQuery({
    queryKey: ["qc-batches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inventory_batches")
        .select("id, batch_number, quantity, qc_status, products(sku, name), stores(store_code)")
        .in("qc_status", ["PENDING", "PASSED", "FAILED"])
        .order("received_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const inspectMutation = useMutation({
    mutationFn: async ({ result }: { result: "PASSED" | "FAILED" }) => {
      if (!selectedBatchId) throw new Error("No batch selected");
      // Create QC record
      await supabase.from("qc_inspections").insert({
        batch_id: selectedBatchId,
        inspector_id: user?.id,
        result,
        notes: notes || null,
      });
      // Update batch qc_status (and quarantine if failed)
      const update: any = { qc_status: result };
      if (result === "FAILED") update.status = "QUARANTINED";
      await supabase.from("inventory_batches").update(update).eq("id", selectedBatchId);
    },
    onSuccess: (_, { result }) => {
      toast.success(result === "PASSED" ? "Batch passed QC inspection." : "Batch failed — moved to quarantine.");
      queryClient.invalidateQueries({ queryKey: ["qc-batches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-batches"] });
      setSelectedBatchId(null);
      setNotes("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selected = batches?.find((b) => b.id === selectedBatchId);

  return (
    <>
      <PageHeader
        title="QC Inspection"
        description="Quality control workflow — inspect batches and pass or quarantine them."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 page-section">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold">Inspection Queue</h2>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 font-medium text-muted-foreground">Batch #</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Product</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Store</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground text-right">Qty</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">QC Status</th>
                  <th className="px-5 py-3 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {(batches ?? []).map((b: any) => (
                  <tr key={b.id} className={`table-row-hover border-b border-border/50 ${selectedBatchId === b.id ? "bg-primary/5" : ""}`}>
                    <td className="px-5 py-3 font-mono text-xs">{b.batch_number}</td>
                    <td className="px-5 py-3">
                      <div className="font-medium">{b.products?.name}</div>
                      <div className="text-xs text-muted-foreground">{b.products?.sku}</div>
                    </td>
                    <td className="px-5 py-3">{b.stores?.store_code}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{b.quantity}</td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className={statusBadge[b.qc_status]?.cls || ""}>{statusBadge[b.qc_status]?.label || b.qc_status}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      {b.qc_status === "PENDING" && (
                        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setSelectedBatchId(b.id)}>
                          Inspect
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>

        <div className="page-section p-5 space-y-4">
          <h3 className="font-semibold">Inspection Form</h3>
          {selected ? (
            <>
              <p className="text-sm text-muted-foreground">Batch: <span className="font-mono font-semibold">{selected.batch_number}</span></p>
              <p className="text-sm">{(selected as any).products?.name} — {(selected as any).products?.sku}</p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Inspection Notes</label>
                <Textarea placeholder="Enter inspection observations…" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
                  onClick={() => inspectMutation.mutate({ result: "PASSED" })}
                  disabled={inspectMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" /> Pass
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => inspectMutation.mutate({ result: "FAILED" })}
                  disabled={inspectMutation.isPending}
                >
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