import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Plus, Package } from "lucide-react";
import { getFEFOTransferSuggestion, type TransferSuggestion } from "@/lib/fefo";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import DataTableFilter, { matchesSearch } from "@/components/DataTableFilter";

const statusMap: Record<string, { cls: string; label: string }> = {
  PENDING: { cls: "bg-warning/10 text-warning border-warning/30", label: "Pending" },
  IN_TRANSIT: { cls: "bg-info/10 text-info border-info/30", label: "In Transit" },
  COMPLETED: { cls: "bg-success/10 text-success border-success/30", label: "Completed" },
};

const Transfers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [productId, setProductId] = useState("");
  const [fromStoreId, setFromStoreId] = useState("");
  const [toStoreId, setToStoreId] = useState("");
  const [qty, setQty] = useState("");
  const [suggestions, setSuggestions] = useState<TransferSuggestion[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: transfers } = useQuery({
    queryKey: ["stock-transfers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stock_transfers")
        .select("*, inventory_batches(batch_number, expiry_date, product_id, products(sku, name)), from_store:stores!stock_transfers_from_store_id_fkey(store_code), to_store:stores!stock_transfers_to_store_id_fkey(store_code)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, store_code, name").order("store_code");
      return data ?? [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, sku, name").order("sku");
      return data ?? [];
    },
  });

  const handleSuggest = async () => {
    if (!productId || !fromStoreId || !qty) return;
    const result = await getFEFOTransferSuggestion(productId, fromStoreId, Number(qty));
    setSuggestions(result);
    if (result.length === 0) toast.info("No eligible batches found at source store.");
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!toStoreId || suggestions.length === 0) throw new Error("Select destination and get suggestions first");
      for (const s of suggestions) {
        const code = `TRF-${Date.now().toString(36).toUpperCase()}`;
        // Create transfer record
        await supabase.from("stock_transfers").insert({
          transfer_code: code,
          batch_id: s.batchId,
          from_store_id: fromStoreId,
          to_store_id: toStoreId,
          quantity: s.quantity,
          status: "PENDING",
          created_by: user?.id,
        });
        // Deduct from source batch
        const { data: srcBatch } = await supabase.from("inventory_batches").select("quantity").eq("id", s.batchId).single();
        if (srcBatch) {
          const newQty = srcBatch.quantity - s.quantity;
          await supabase.from("inventory_batches").update({ quantity: newQty <= 0 ? 0 : newQty, status: newQty <= 0 ? "TRANSFERRED" : "AVAILABLE" }).eq("id", s.batchId);
        }
        // Create new batch at destination (FEFO: same expiry, new location)
        await supabase.from("inventory_batches").insert({
          batch_number: s.batchNumber,
          product_id: productId,
          store_id: toStoreId,
          quantity: s.quantity,
          expiry_date: s.expiryDate,
          location: `RESERVE-NEW`,
          status: "AVAILABLE",
          qc_status: "PASSED",
          received_by: user?.id,
        });
      }
    },
    onSuccess: () => {
      toast.success("FEFO transfer created — earliest-expiry batches transferred first.");
      queryClient.invalidateQueries({ queryKey: ["stock-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-batches"] });
      setShowNew(false);
      setSuggestions([]);
      setQty("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Stock Transfers"
        description="FEFO-based inter-store stock movements — earliest-expiry batches are always transferred first."
        actions={<Button size="sm" onClick={() => setShowNew(!showNew)}><Plus className="h-4 w-4 mr-1" /> New Transfer</Button>}
      />

      {showNew && (
        <div className="page-section p-5 mb-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> FEFO Transfer Builder</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {(products ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.sku} — {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From Store</Label>
              <Select value={fromStoreId} onValueChange={setFromStoreId}>
                <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  {(stores ?? []).filter((s) => s.id !== toStoreId).map((s) => <SelectItem key={s.id} value={s.id}>{s.store_code} — {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>To Store</Label>
              <Select value={toStoreId} onValueChange={setToStoreId}>
                <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                <SelectContent>
                  {(stores ?? []).filter((s) => s.id !== fromStoreId).map((s) => <SelectItem key={s.id} value={s.id}>{s.store_code} — {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <div className="flex gap-2">
                <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="100" />
                <Button onClick={handleSuggest}>Suggest</Button>
              </div>
            </div>
          </div>

          {suggestions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">FEFO Allocation (earliest-expiry first)</h4>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                    <div>
                      <span className="font-mono text-xs font-semibold">{s.batchNumber}</span>
                      <span className="text-xs text-muted-foreground ml-2">Exp: {s.expiryDate} ({s.daysLeft}d left)</span>
                    </div>
                    <div className="text-sm font-semibold tabular-nums">{s.quantity} units</div>
                  </div>
                ))}
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !toStoreId}>
                {createMutation.isPending ? "Creating…" : "Confirm FEFO Transfer"}
              </Button>
            </div>
          )}
        </div>
      )}

  const filteredTransfers = (transfers ?? []).filter((t: any) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    return matchesSearch(t, search, ["transfer_code", "inventory_batches.batch_number", "inventory_batches.products.sku", "from_store.store_code", "to_store.store_code"]);
  });

      <div className="page-section">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-semibold">Transfer History</h2>
            <div className="flex items-center gap-2">
              <div className="w-56">
                <DataTableFilter value={search} onChange={setSearch} placeholder="Search transfer, batch, store…" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
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
              {filteredTransfers.map((t: any) => (
                <tr key={t.id} className="table-row-hover border-b border-border/50">
                  <td className="px-5 py-3 font-mono text-xs font-semibold">{t.transfer_code}</td>
                  <td className="px-5 py-3">
                    <div className="font-mono text-xs">{t.inventory_batches?.products?.sku ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{t.inventory_batches?.batch_number}</div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-semibold">{t.from_store?.store_code}</span>
                    <ArrowRight className="inline h-3 w-3 mx-1 text-muted-foreground" />
                    <span className="font-semibold">{t.to_store?.store_code}</span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{t.quantity}</td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className={statusMap[t.status]?.cls || ""}>{statusMap[t.status]?.label || t.status}</Badge>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">{t.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
              {filteredTransfers.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">No transfers yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default Transfers;