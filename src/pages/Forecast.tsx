import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Loader2, AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { DataTable, DataTableColumn } from "@/components/DataTable";

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
  const [horizon, setHorizon] = useState(14);
  const [loading, setLoading] = useState(false);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("wms-forecast", { body: { horizonDays: horizon } });
      if (error) throw error;
      setForecasts(data?.forecasts ?? []);
      setGeneratedAt(data?.generatedAt ?? null);
      toast.success(`Forecast generated for ${data?.forecasts?.length ?? 0} SKU/store combos`);
    } catch (e: any) {
      toast.error(e.message || "Forecast failed");
    } finally {
      setLoading(false);
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