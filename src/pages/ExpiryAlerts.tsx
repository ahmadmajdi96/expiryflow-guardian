import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Tag } from "lucide-react";
import { toast } from "sonner";

const zoneClass: Record<string, string> = { GREEN: "zone-green", YELLOW: "zone-yellow", ORANGE: "zone-orange", RED: "zone-red", BLACK: "zone-black" };
const zoneEmoji: Record<string, string> = { GREEN: "🟢", YELLOW: "🟡", ORANGE: "🟠", RED: "🔴", BLACK: "⚫" };

function getZone(daysLeft: number) {
  if (daysLeft <= 2) return "BLACK";
  if (daysLeft <= 7) return "RED";
  if (daysLeft <= 14) return "ORANGE";
  if (daysLeft <= 30) return "YELLOW";
  return "GREEN";
}

const ExpiryAlerts = () => {
  const [storeFilter, setStoreFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: batches, isLoading } = useQuery({
    queryKey: ["expiry-batches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inventory_batches")
        .select("*, products(sku, name, current_price, unit_cost), stores(store_code)")
        .eq("status", "AVAILABLE")
        .eq("qc_status", "PASSED")
        .order("expiry_date", { ascending: true });
      return data ?? [];
    },
  });

  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("store_code").order("store_code");
      return data ?? [];
    },
  });

  const today = new Date();
  const enriched = (batches ?? []).map((b) => {
    const days = Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000);
    return { ...b, daysLeft: days, zone: getZone(days) };
  }).filter((b) => b.zone !== "GREEN"); // only show warning zones

  const filtered = enriched.filter((a) => {
    if (storeFilter !== "all" && (a as any).stores?.store_code !== storeFilter) return false;
    if (zoneFilter !== "all" && a.zone !== zoneFilter) return false;
    return true;
  });

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]);
  }, []);

  const proposeMutation = useMutation({
    mutationFn: async (batchIds: string[]) => {
      const items = enriched.filter((b) => batchIds.includes(b.id)).map((b) => ({
        sku: (b as any).products?.sku,
        batchNumber: b.batch_number,
        storeId: (b as any).stores?.store_code,
        quantityAvailable: b.quantity,
        expiryDate: b.expiry_date,
        daysUntilExpiry: b.daysLeft,
        currentPrice: Number((b as any).products?.current_price ?? 0),
        unitCost: Number((b as any).products?.unit_cost ?? 0),
        zone: b.zone,
      }));

      const { data, error } = await supabase.functions.invoke("ai-pricing-proposal", {
        body: { items },
      });
      if (error) throw error;

      // Save proposals to markdown_proposals table
      const proposals = data?.proposals ?? [];
      for (const p of proposals) {
        const batch = enriched.find((b) => (b as any).products?.sku === p.sku && batchIds.includes(b.id));
        if (batch) {
          await supabase.from("markdown_proposals").insert({
            batch_id: batch.id,
            sku: p.sku,
            batch_number: p.batchNumber,
            current_price: p.currentPrice,
            proposed_price: p.proposedPrice,
            discount_percent: p.discountPercent,
            reasoning: p.reasoning,
            urgency: p.urgency,
          });
        }
      }
      return proposals;
    },
    onSuccess: (proposals) => {
      toast.success(`${proposals.length} markdown proposals created. Go to Markdown Approvals to review.`);
      setSelected([]);
      queryClient.invalidateQueries({ queryKey: ["markdown-proposals"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to generate proposals"),
  });

  return (
    <>
      <PageHeader
        title="Near-Expiry Alerts"
        description="Monitor and act on stock approaching expiry across all stores. Auto-refreshes every 5 minutes."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
            <Button
              size="sm"
              disabled={selected.length === 0 || proposeMutation.isPending}
              onClick={() => proposeMutation.mutate(selected)}
            >
              <Tag className="h-4 w-4 mr-1" /> {proposeMutation.isPending ? "Generating…" : `Propose Markdown (${selected.length})`}
            </Button>
          </div>
        }
      />

      <div className="flex gap-3 mb-4">
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Store" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stores</SelectItem>
            {(stores ?? []).map((s) => (
              <SelectItem key={s.store_code} value={s.store_code}>{s.store_code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Zone" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            <SelectItem value="YELLOW">🟡 Yellow</SelectItem>
            <SelectItem value="ORANGE">🟠 Orange</SelectItem>
            <SelectItem value="RED">🔴 Red</SelectItem>
            <SelectItem value="BLACK">⚫ Black</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="page-section">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 w-10"></th>
                <th className="px-5 py-3 font-medium text-muted-foreground">SKU</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Product</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Batch #</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Store</th>
                <th className="px-5 py-3 font-medium text-muted-foreground text-right">Qty</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Expiry</th>
                <th className="px-5 py-3 font-medium text-muted-foreground text-right">Days Left</th>
                <th className="px-5 py-3 font-medium text-muted-foreground text-right">Price</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Zone</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="table-row-hover border-b border-border/50">
                  <td className="px-5 py-3">
                    <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggleSelect(a.id)} className="rounded border-border" />
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">{(a as any).products?.sku}</td>
                  <td className="px-5 py-3 font-medium">{(a as any).products?.name}</td>
                  <td className="px-5 py-3 font-mono text-xs">{a.batch_number}</td>
                  <td className="px-5 py-3">{(a as any).stores?.store_code}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{a.quantity}</td>
                  <td className="px-5 py-3 font-mono text-xs">{a.expiry_date}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold">{a.daysLeft}</td>
                  <td className="px-5 py-3 text-right tabular-nums">${Number((a as any).products?.current_price ?? 0).toFixed(2)}</td>
                  <td className="px-5 py-3"><span className={`pill ${zoneClass[a.zone]}`}>{zoneEmoji[a.zone]} {a.zone}</span></td>
                  <td className="px-5 py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      disabled={proposeMutation.isPending}
                      onClick={() => proposeMutation.mutate([a.id])}
                    >
                      {a.zone === "RED" ? "Urgent Clear" : "Propose MD"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </>
  );
};

export default ExpiryAlerts;