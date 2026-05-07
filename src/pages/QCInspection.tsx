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
import { useNavigate } from "react-router-dom";
import { DataTable, DataTableColumn } from "@/components/DataTable";

const statusBadge: Record<string, { cls: string; label: string }> = {
  PENDING: { cls: "bg-warning/10 text-warning border-warning/30", label: "Pending" },
  PASSED: { cls: "bg-success/10 text-success border-success/30", label: "Passed" },
  FAILED: { cls: "bg-destructive/10 text-destructive border-destructive/30", label: "Failed" },
};

const QCInspection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const { data: batches } = useQuery({
    queryKey: ["qc-batches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inventory_batches")
        .select("id, batch_number, quantity, qc_status, expiry_date, received_at, products!inventory_batches_product_id_fkey(sku, name), stores!inventory_batches_store_id_fkey(store_code)")
        .order("received_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  const inspectMutation = useMutation({
    mutationFn: async ({ result }: { result: "PASSED" | "FAILED" }) => {
      if (!selectedBatchId) throw new Error("No batch selected.");
      const batch = batches?.find((b) => b.id === selectedBatchId);
      if (!batch || batch.qc_status !== "PENDING") throw new Error("Only PENDING batches can be inspected.");
      const { error: insertErr } = await supabase.from("qc_inspections").insert({
        batch_id: selectedBatchId, inspector_id: user?.id, result, notes: notes || null,
      });
      if (insertErr) throw insertErr;
      const update: any = { qc_status: result };
      if (result === "FAILED") update.status = "QUARANTINED";
      const { error: updateErr } = await supabase.from("inventory_batches").update(update).eq("id", selectedBatchId);
      if (updateErr) throw updateErr;
    },
    onSuccess: (_, { result }) => {
      toast.success(result === "PASSED" ? "Batch passed QC inspection." : "Batch failed — moved to quarantine.");
      queryClient.invalidateQueries({ queryKey: ["qc-batches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-batches"] });
      queryClient.invalidateQueries({ queryKey: ["quarantine-batches"] });
      setSelectedBatchId(null);
      setNotes("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selected = batches?.find((b) => b.id === selectedBatchId);

  const columns: DataTableColumn<any>[] = [
    { key: "batch_number", header: "Batch #", accessor: (r) => r.batch_number, sortable: true, filter: "text", cell: (r) => <span className="font-mono text-xs">{r.batch_number}</span> },
    { key: "product", header: "Product", accessor: (r) => r.products?.name, sortable: true, filter: "text", cell: (r) => (
      <div><div className="font-medium">{r.products?.name}</div><div className="text-xs text-muted-foreground">{r.products?.sku}</div></div>
    )},
    { key: "store", header: "Store", accessor: (r) => r.stores?.store_code, sortable: true, filter: "select" },
    { key: "quantity", header: "Qty", accessor: (r) => r.quantity, sortable: true, align: "right", cell: (r) => <span className="tabular-nums">{r.quantity}</span> },
    { key: "qc_status", header: "QC Status", accessor: (r) => r.qc_status, filter: "select", options: ["PENDING", "PASSED", "FAILED"], cell: (r) => (
      <Badge variant="outline" className={statusBadge[r.qc_status]?.cls || ""}>{statusBadge[r.qc_status]?.label || r.qc_status}</Badge>
    )},
    { key: "action", header: "Action", accessor: () => "", exportable: false, cell: (r) => (
      r.qc_status === "PENDING" ? (
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); setSelectedBatchId(r.id); }}>Inspect</Button>
      ) : null
    )},
  ];

  return (
    <>
      <PageHeader
        title="QC Inspection"
        description="Quality control workflow — inspect batches and pass or quarantine them."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/quarantine")}>Quarantine</Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/receiving")}>Receiving</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DataTable
            rows={batches ?? []}
            columns={columns}
            rowKey={(r) => r.id}
            exportFilename="qc-inspection"
            tableId="qc"
            createdAtKey="received_at"
            emptyMessage="No batches to inspect."
            rowClassName={(r) => selectedBatchId === r.id ? "bg-primary/5" : ""}
          />
        </div>

        <div className="page-section p-5 space-y-4 h-fit">
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
                <Button className="flex-1 bg-success hover:bg-success/90 text-success-foreground" onClick={() => inspectMutation.mutate({ result: "PASSED" })} disabled={inspectMutation.isPending}>
                  <CheckCircle className="h-4 w-4 mr-1" /> Pass
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => inspectMutation.mutate({ result: "FAILED" })} disabled={inspectMutation.isPending}>
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