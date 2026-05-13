import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Triage = {
  holdReason: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendedAction: "RELEASE" | "EXTEND_HOLD" | "WRITE_OFF" | "RETURN_TO_SUPPLIER" | "ESCALATE_TO_QA";
  rationale: string;
  followUpChecks: string[];
};

const sevClass: Record<string, string> = {
  LOW: "bg-success/10 text-success border-success/30",
  MEDIUM: "bg-warning/10 text-warning border-warning/30",
  HIGH: "bg-destructive/10 text-destructive border-destructive/30",
  CRITICAL: "bg-destructive text-destructive-foreground border-destructive",
};

const Quarantine = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [triageBatch, setTriageBatch] = useState<any | null>(null);
  const [triageNotes, setTriageNotes] = useState("");
  const [triageLoading, setTriageLoading] = useState(false);
  const [triage, setTriage] = useState<Triage | null>(null);
  const [triageAuditId, setTriageAuditId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<Array<{ batch: any; triage: Triage | null; auditId: string | null; error?: string; selected: boolean }>>([]);

  const runTriage = async () => {
    if (!triageBatch) return;
    setTriageLoading(true);
    setTriage(null);
    setTriageAuditId(null);
    try {
      const { data, error } = await supabase.functions.invoke("wms-quarantine-triage", {
        body: { batchId: triageBatch.id, inspectorNotes: triageNotes || null, userId: user?.id },
      });
      if (error) throw error;
      setTriage(data?.triage ?? null);
      setTriageAuditId(data?.auditId ?? null);
    } catch (e: any) {
      toast.error(e.message || "Triage failed");
    } finally {
      setTriageLoading(false);
    }
  };

  const recordTriageDecision = async (id: string | null, decision: string) => {
    if (!id) return;
    await supabase.from("ai_audit_log").update({ user_decision: decision, decision_at: new Date().toISOString() }).eq("id", id);
  };

  const openTriage = (batch: any) => {
    setTriageBatch(batch);
    setTriageNotes("");
    setTriage(null);
    setTimeout(() => runTriage(), 0);
  };

  const { data: batches } = useQuery({
    queryKey: ["quarantine-batches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inventory_batches")
        .select("*, products!inventory_batches_product_id_fkey(sku, name), stores!inventory_batches_store_id_fkey(store_code)")
        .eq("status", "QUARANTINED")
        .order("received_at", { ascending: false });
      return data ?? [];
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("inventory_batches").update({ status: "AVAILABLE", qc_status: "PASSED" }).eq("id", id);
    },
    onSuccess: () => {
      toast.success("Batch released from quarantine.");
      queryClient.invalidateQueries({ queryKey: ["quarantine-batches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-batches"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const writeOffMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("inventory_batches").update({ status: "WRITTEN_OFF", quantity: 0 }).eq("id", id);
    },
  const runBulkTriage = async (rows: any[]) => {
    setBulkOpen(true);
    setBulkLoading(true);
    setBulkResults(rows.map((b) => ({ batch: b, triage: null, auditId: null, selected: true })));
    const results = await Promise.all(rows.map(async (b) => {
      try {
        const { data, error } = await supabase.functions.invoke("wms-quarantine-triage", {
          body: { batchId: b.id, userId: user?.id },
        });
        if (error) throw error;
        return { batch: b, triage: data?.triage ?? null, auditId: data?.auditId ?? null, selected: true };
      } catch (e: any) {
        return { batch: b, triage: null, auditId: null, error: e.message, selected: false };
      }
    }));
    setBulkResults(results);
    setBulkLoading(false);
  };

  const applyBulk = async (action: "RELEASE" | "WRITE_OFF") => {
    const targets = bulkResults.filter((r) => r.selected && r.triage);
    if (targets.length === 0) { toast.error("No batches selected"); return; }
    for (const r of targets) {
      try {
        if (action === "RELEASE") await supabase.from("inventory_batches").update({ status: "AVAILABLE", qc_status: "PASSED" }).eq("id", r.batch.id);
        else await supabase.from("inventory_batches").update({ status: "WRITTEN_OFF", quantity: 0 }).eq("id", r.batch.id);
        await recordTriageDecision(r.auditId, `BULK_${action}`);
      } catch (e: any) {
        toast.error(`${r.batch.batch_number}: ${e.message}`);
      }
    }
    toast.success(`Applied ${action.toLowerCase().replace("_", " ")} to ${targets.length} batches`);
    queryClient.invalidateQueries({ queryKey: ["quarantine-batches"] });
    setBulkOpen(false);
    setBulkResults([]);
  };
    onSuccess: () => {
      toast.success("Batch written off.");
      queryClient.invalidateQueries({ queryKey: ["quarantine-batches"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const columns: DataTableColumn<any>[] = [
    { key: "batch_number", header: "Batch #", accessor: (r) => r.batch_number, sortable: true, filter: "text", cell: (r) => (
      <span className="font-mono text-xs cursor-pointer hover:text-primary" onClick={() => navigate(`/batch/${r.id}`)}>{r.batch_number}</span>
    )},
    { key: "product", header: "Product", accessor: (r) => r.products?.name, sortable: true, filter: "text", cell: (r) => (
      <div><div className="font-medium">{r.products?.name}</div><div className="text-xs text-muted-foreground">{r.products?.sku}</div></div>
    )},
    { key: "store", header: "Store", accessor: (r) => r.stores?.store_code, sortable: true, filter: "select" },
    { key: "quantity", header: "Qty", accessor: (r) => r.quantity, sortable: true, align: "right", cell: (r) => <span className="tabular-nums">{r.quantity}</span> },
    { key: "qc_status", header: "QC Status", accessor: (r) => r.qc_status, filter: "select", cell: (r) => (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">{r.qc_status}</Badge>
    )},
    { key: "received_at", header: "Date", accessor: (r) => r.received_at, sortable: true, filter: "date", cell: (r) => <span className="font-mono text-xs">{r.received_at?.slice(0, 10)}</span> },
    { key: "actions", header: "Actions", accessor: () => "", exportable: false, cell: (r) => (
      <div className="space-x-1 flex">
        <Button variant="outline" size="sm" className="text-xs h-7 border-primary/30 text-primary" onClick={(e) => { e.stopPropagation(); openTriage(r); }}>
          <Sparkles className="h-3 w-3 mr-1" /> AI Triage
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); releaseMutation.mutate(r.id); }} disabled={releaseMutation.isPending}>Release</Button>
        <Button variant="outline" size="sm" className="text-xs h-7 text-destructive" onClick={(e) => { e.stopPropagation(); writeOffMutation.mutate(r.id); }} disabled={writeOffMutation.isPending}>Write-Off</Button>
      </div>
    )},
  ];

  return (
    <>
      <PageHeader
        title="Quarantine Management"
        description="Quarantined stock is excluded from sale, markdown proposals, and picking."
        badge={<Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">{(batches ?? []).length} items</Badge>}
        actions={<Button variant="outline" size="sm" onClick={() => navigate("/qc-inspection")}>QC Inspection</Button>}
      />
      <DataTable
        rows={batches ?? []}
        columns={columns}
        rowKey={(r) => r.id}
        exportFilename="quarantine"
        tableId="quarantine"
        emptyMessage="No quarantined items"
        selectable
        bulkActions={[
          { label: "AI Triage Selected", onRun: (rows) => runBulkTriage(rows), variant: "default" },
        ]}
      />

      <Dialog open={!!triageBatch} onOpenChange={(o) => !o && setTriageBatch(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> AI Quarantine Triage
            </DialogTitle>
          </DialogHeader>
          {triageBatch && (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="font-semibold">{triageBatch.products?.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{triageBatch.products?.sku} · Batch {triageBatch.batch_number} · Qty {triageBatch.quantity}</div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Inspector notes (optional, improves triage)</label>
                <Textarea value={triageNotes} onChange={(e) => setTriageNotes(e.target.value)} placeholder="e.g. cold-chain breach 4h, packaging dented…" rows={2} className="text-xs" />
                <Button size="sm" variant="outline" onClick={runTriage} disabled={triageLoading}>
                  {triageLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                  Re-run with notes
                </Button>
              </div>

              {triageLoading && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Loader2 className="h-4 w-4 animate-spin" /> Analyzing batch & inspection history…
                </div>
              )}

              {triage && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border p-2.5">
                      <div className="text-[10px] uppercase text-muted-foreground">Hold reason</div>
                      <div className="text-sm font-semibold">{triage.holdReason}</div>
                    </div>
                    <div className="rounded-lg border p-2.5">
                      <div className="text-[10px] uppercase text-muted-foreground">Severity</div>
                      <Badge variant="outline" className={`${sevClass[triage.severity]} text-xs mt-0.5`}>{triage.severity}</Badge>
                    </div>
                  </div>
                  <div className="rounded-lg border p-2.5">
                    <div className="text-[10px] uppercase text-muted-foreground">Recommended action</div>
                    <div className="text-sm font-semibold">{triage.recommendedAction.replace(/_/g, " ")}</div>
                    <div className="text-xs text-muted-foreground mt-1">{triage.rationale}</div>
                  </div>
                  {triage.followUpChecks?.length > 0 && (
                    <div className="rounded-lg border p-2.5">
                      <div className="text-[10px] uppercase text-muted-foreground mb-1">Follow-up checks</div>
                      <ul className="list-disc pl-4 text-xs space-y-0.5">
                        {triage.followUpChecks.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex gap-2">
            {triage && triageBatch && (
              <>
                {triage.recommendedAction === "RELEASE" && (
                  <Button size="sm" onClick={async () => { await recordTriageDecision(triageAuditId, "ACCEPTED:RELEASE"); releaseMutation.mutate(triageBatch.id); setTriageBatch(null); }}>Apply: Release</Button>
                )}
                {(triage.recommendedAction === "WRITE_OFF" || triage.recommendedAction === "RETURN_TO_SUPPLIER") && (
                  <Button size="sm" variant="destructive" onClick={async () => { await recordTriageDecision(triageAuditId, `ACCEPTED:${triage.recommendedAction}`); writeOffMutation.mutate(triageBatch.id); setTriageBatch(null); }}>Apply: Write-off</Button>
                )}
              </>
            )}
            <Button size="sm" variant="ghost" onClick={async () => { if (triageAuditId && triage) await recordTriageDecision(triageAuditId, "DISMISSED"); setTriageBatch(null); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={(o) => !o && setBulkOpen(false)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Bulk AI Triage — {bulkResults.length} batches
            </DialogTitle>
          </DialogHeader>
          {bulkLoading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Running AI triage on selected batches…
            </div>
          )}
          {!bulkLoading && bulkResults.length > 0 && (
            <div className="space-y-2">
              {bulkResults.map((r, i) => (
                <div key={r.batch.id} className="rounded-lg border p-3 flex gap-3 items-start text-sm">
                  <input
                    type="checkbox"
                    checked={r.selected}
                    onChange={(e) => setBulkResults((p) => p.map((x, j) => j === i ? { ...x, selected: e.target.checked } : x))}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs">{r.batch.batch_number}</span>
                      <span className="font-medium">{r.batch.products?.name}</span>
                      <Badge variant="outline" className="text-[10px]">Qty {r.batch.quantity}</Badge>
                      {r.triage && <Badge variant="outline" className={`${sevClass[r.triage.severity]} text-[10px]`}>{r.triage.severity}</Badge>}
                      {r.triage && <Badge variant="outline" className="text-[10px]">{r.triage.recommendedAction.replace(/_/g, " ")}</Badge>}
                    </div>
                    {r.error && <div className="text-xs text-destructive mt-1">Error: {r.error}</div>}
                    {r.triage && (
                      <>
                        <div className="text-xs text-muted-foreground mt-1">{r.triage.holdReason} — {r.triage.rationale}</div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => applyBulk("RELEASE")} disabled={bulkLoading}>Release Selected</Button>
            <Button size="sm" variant="destructive" onClick={() => applyBulk("WRITE_OFF")} disabled={bulkLoading}>Write-off Selected</Button>
            <Button size="sm" variant="ghost" onClick={() => setBulkOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Quarantine;