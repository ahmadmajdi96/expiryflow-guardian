import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Loader2, AlertTriangle, Sparkles, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { useAuth } from "@/hooks/useAuth";

type Forecast = {
  sku: string; store: string; name?: string; category?: string;
  totalQty?: number; soonestExpiry?: string; soonestDays?: number; price?: number;
  predictedSellThrough: number; predictedWriteOffUnits: number;
  writeOffRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recommendation: string; confidence: "LOW" | "MEDIUM" | "HIGH";
};

const riskClass: Record<string, string> = {
  LOW: "bg-success/10 text-success border-success/30",
  MEDIUM: "bg-warning/10 text-warning border-warning/30",
  HIGH: "bg-destructive/10 text-destructive border-destructive/30",
  CRITICAL: "bg-destructive text-destructive-foreground border-destructive",
};

const Forecast = () => {
  const { user } = useAuth();
  const [horizon, setHorizon] = useState(14);
  const [loading, setLoading] = useState(false);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [actioningKey, setActioningKey] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("wms-forecast", { body: { horizonDays: horizon, userId: user?.id } });
      if (error) throw error;
      setForecasts(data?.forecasts ?? []);
      setGeneratedAt(data?.generatedAt ?? null);
      setAuditId(data?.auditId ?? null);
      toast.success(`Forecast generated for ${data?.forecasts?.length ?? 0} SKU/store combos`);
    } catch (e: any) {
      toast.error(e.message || "Forecast failed");
    } finally {
      setLoading(false);
    }
  };

  const recordDecision = async (decision: string) => {
    if (!auditId) return;
    await supabase.from("ai_audit_log").update({ user_decision: decision, decision_at: new Date().toISOString() }).eq("id", auditId);
  };

  const requestMarkdown = async (f: Forecast) => {
    const key = `${f.sku}@${f.store}`;
    setActioningKey(key);
    try {
      // Find a batch for this SKU/store to attach to
      const { data: prod } = await supabase.from("products").select("id").eq("sku", f.sku).maybeSingle();
      const { data: store } = await supabase.from("stores").select("id").eq("store_code", f.store).maybeSingle();
      if (!prod || !store) throw new Error("Product or store not found");
      const { data: batch } = await supabase
        .from("inventory_batches")
        .select("id, batch_number, quantity, expiry_date")
        .eq("product_id", prod.id)
        .eq("store_id", store.id)
        .eq("status", "AVAILABLE")
        .order("expiry_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!batch) throw new Error("No available batch found");
      const discount = f.writeOffRisk === "CRITICAL" ? 50 : f.writeOffRisk === "HIGH" ? 35 : f.writeOffRisk === "MEDIUM" ? 20 : 10;
      const current = f.price ?? 0;
      const proposed = +(current * (1 - discount / 100)).toFixed(2);
      const { error } = await supabase.from("markdown_proposals").insert({
        batch_id: batch.id,
        batch_number: batch.batch_number,
        sku: f.sku,
        current_price: current,
        proposed_price: proposed,
        discount_percent: discount,
        urgency: f.writeOffRisk,
        status: "pending",
        reasoning: `Forecast horizon ${horizon}d: ${f.predictedWriteOffUnits} units at ${f.writeOffRisk} write-off risk. ${f.recommendation}`,
      });
      if (error) throw error;
      await recordDecision(`MARKDOWN_REQUESTED:${f.sku}@${f.store}`);
      toast.success(`Markdown proposal created for ${f.sku} (${discount}% off)`);
    } catch (e: any) {
      toast.error(e.message || "Markdown request failed");
    } finally {
      setActioningKey(null);
    }
  };

  const createWriteOffTask = async (f: Forecast) => {
    const key = `${f.sku}@${f.store}`;
    setActioningKey(key);
    try {
      const { data: prod } = await supabase.from("products").select("id").eq("sku", f.sku).maybeSingle();
      const { data: store } = await supabase.from("stores").select("id").eq("store_code", f.store).maybeSingle();
      const { data: batch } = prod && store ? await supabase
        .from("inventory_batches")
        .select("id")
        .eq("product_id", prod.id)
        .eq("store_id", store.id)
        .eq("status", "AVAILABLE")
        .order("expiry_date", { ascending: true })
        .limit(1)
        .maybeSingle() : { data: null };
      const { error } = await supabase.from("write_off_tasks").insert({
        batch_id: batch?.id ?? null,
        sku: f.sku,
        store: f.store,
        quantity: f.predictedWriteOffUnits,
        reason: `AI forecast: ${f.writeOffRisk} risk over ${horizon}d. ${f.recommendation}`,
        source: "FORECAST",
        status: "OPEN",
        created_by: user?.id,
      });
      if (error) throw error;
      await recordDecision(`WRITE_OFF_TASK:${f.sku}@${f.store}`);
      toast.success(`Write-off task created (${f.predictedWriteOffUnits} units)`);
    } catch (e: any) {
      toast.error(e.message || "Write-off task failed");
    } finally {
      setActioningKey(null);
    }
  };

  const totalWriteOffUnits = forecasts.reduce((s, f) => s + (f.predictedWriteOffUnits || 0), 0);
  const totalWriteOffValue = forecasts.reduce((s, f) => s + (f.predictedWriteOffUnits || 0) * (f.price || 0), 0);
  const critical = forecasts.filter((f) => f.writeOffRisk === "CRITICAL" || f.writeOffRisk === "HIGH").length;

  const columns: DataTableColumn<Forecast>[] = [
    { key: "sku", header: "SKU", accessor: (r) => r.sku, sortable: true, filter: "text", cell: (r) => <span className="font-mono text-xs">{r.sku}</span> },
    { key: "name", header: "Product", accessor: (r) => r.name ?? "", sortable: true, filter: "text" },
    { key: "store", header: "Store", accessor: (r) => r.store, sortable: true, filter: "select" },
    { key: "category", header: "Category", accessor: (r) => r.category ?? "", filter: "select" },
    { key: "totalQty", header: "On hand", accessor: (r) => r.totalQty ?? 0, sortable: true, align: "right", cell: (r) => <span className="tabular-nums">{r.totalQty ?? 0}</span> },
    { key: "soonestDays", header: "Soonest exp.", accessor: (r) => r.soonestDays ?? 0, sortable: true, align: "right", cell: (r) => <span className="tabular-nums">{r.soonestDays}d</span> },
    { key: "predictedSellThrough", header: `Sell-through (${horizon}d)`, accessor: (r) => r.predictedSellThrough, sortable: true, align: "right", cell: (r) => <span className="tabular-nums font-semibold">{r.predictedSellThrough}</span> },
    { key: "predictedWriteOffUnits", header: "Write-off risk units", accessor: (r) => r.predictedWriteOffUnits, sortable: true, align: "right", cell: (r) => <span className="tabular-nums">{r.predictedWriteOffUnits}</span> },
    { key: "writeOffRisk", header: "Risk", accessor: (r) => r.writeOffRisk, filter: "select", options: ["LOW","MEDIUM","HIGH","CRITICAL"], cell: (r) => <Badge variant="outline" className={`${riskClass[r.writeOffRisk]} text-xs`}>{r.writeOffRisk}</Badge> },
    { key: "confidence", header: "Conf.", accessor: (r) => r.confidence, filter: "select", cell: (r) => <span className="text-xs text-muted-foreground">{r.confidence}</span> },
    { key: "recommendation", header: "AI recommendation", accessor: (r) => r.recommendation, cell: (r) => <span className="text-xs">{r.recommendation}</span> },
    { key: "actions", header: "Actions", accessor: () => "", exportable: false, cell: (r) => {
      const key = `${r.sku}@${r.store}`;
      const busy = actioningKey === key;
      return (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={() => requestMarkdown(r)}>
            <Tag className="h-3 w-3 mr-1" /> Markdown
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30" disabled={busy || r.predictedWriteOffUnits <= 0} onClick={() => createWriteOffTask(r)}>
            <Trash2 className="h-3 w-3 mr-1" /> Write-off
          </Button>
        </div>
      );
    }},
  ];

  return (
    <>
      <PageHeader
        title="AI Demand & Waste Forecast"
        description="AI-predicted sell-through and write-off risk per SKU and store using live on-hand stock and expiry pressure."
        badge={<Badge variant="outline" className="bg-primary/10 text-primary border-primary/30"><Sparkles className="h-3 w-3 mr-1" /> AI-powered</Badge>}
        actions={
          <div className="flex gap-2 items-center">
            <select value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} className="h-9 px-3 text-sm rounded-md border bg-background">
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
            <Button onClick={run} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-2" />}
              {loading ? "Forecasting…" : "Run Forecast"}
            </Button>
          </div>
        }
      />

      {forecasts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="page-section p-4">
            <div className="text-xs text-muted-foreground">SKU/store rows</div>
            <div className="text-2xl font-bold tabular-nums">{forecasts.length}</div>
          </div>
          <div className="page-section p-4">
            <div className="text-xs text-muted-foreground">Predicted write-off units</div>
            <div className="text-2xl font-bold tabular-nums">{totalWriteOffUnits}</div>
          </div>
          <div className="page-section p-4">
            <div className="text-xs text-muted-foreground">Estimated waste value</div>
            <div className="text-2xl font-bold tabular-nums">${totalWriteOffValue.toFixed(2)}</div>
          </div>
          <div className="page-section p-4">
            <div className="text-xs text-muted-foreground">High/critical risk SKUs</div>
            <div className="text-2xl font-bold tabular-nums text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> {critical}
            </div>
          </div>
        </div>
      )}

      {generatedAt && <div className="text-xs text-muted-foreground mb-3">Generated {new Date(generatedAt).toLocaleString()}</div>}

      {forecasts.length === 0 && !loading && (
        <div className="page-section p-12 text-center">
          <Sparkles className="h-10 w-10 text-primary mx-auto mb-3" />
          <h3 className="font-semibold mb-1">No forecast yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Click "Run Forecast" to let CORTA AI analyze your live stock and predict sell-through &amp; write-off risk.</p>
        </div>
      )}

      {forecasts.length > 0 && (
        <DataTable
          rows={forecasts}
          columns={columns}
          rowKey={(r) => `${r.sku}@${r.store}`}
          exportFilename="ai-forecast"
          tableId="ai-forecast"
          emptyMessage="No forecast data"
        />
      )}
    </>
  );
};

export default Forecast;