import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { DataTable, DataTableColumn } from "@/components/DataTable";

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
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: batches, isLoading } = useQuery({
    queryKey: ["expiry-batches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inventory_batches")
        .select("*, products!inventory_batches_product_id_fkey(sku, name, current_price, unit_cost), stores!inventory_batches_store_id_fkey(store_code)")
        .eq("status", "AVAILABLE")
        .eq("qc_status", "PASSED")
        .order("expiry_date", { ascending: true });
      return data ?? [];
    },
  });

  const today = new Date();
  const enriched = (batches ?? []).map((b) => {
    const days = Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000);
    return { ...b, daysLeft: days, zone: getZone(days) };
  }).filter((b) => b.zone !== "GREEN");

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
      queryClient.invalidateQueries({ queryKey: ["markdown-proposals"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to generate proposals"),
  });

  const columns: DataTableColumn<any>[] = [
    { key: "sku", header: "SKU", accessor: (r) => r.products?.sku, sortable: true, filter: "text", cell: (r) => <span className="font-mono text-xs">{r.products?.sku}</span> },
    { key: "product", header: "Product", accessor: (r) => r.products?.name, sortable: true, filter: "text", cell: (r) => <span className="font-medium">{r.products?.name}</span> },
    { key: "batch_number", header: "Batch #", accessor: (r) => r.batch_number, sortable: true, filter: "text", cell: (r) => <span className="font-mono text-xs">{r.batch_number}</span> },
    { key: "store", header: "Store", accessor: (r) => r.stores?.store_code, sortable: true, filter: "select" },
    { key: "quantity", header: "Qty", accessor: (r) => r.quantity, sortable: true, align: "right", cell: (r) => <span className="tabular-nums">{r.quantity}</span> },
    { key: "expiry_date", header: "Expiry", accessor: (r) => r.expiry_date, sortable: true, filter: "date", cell: (r) => <span className="font-mono text-xs">{r.expiry_date}</span> },
    { key: "daysLeft", header: "Days Left", accessor: (r) => r.daysLeft, sortable: true, align: "right", cell: (r) => <span className="tabular-nums font-semibold">{r.daysLeft}</span> },
    { key: "price", header: "Price", accessor: (r) => Number(r.products?.current_price ?? 0), sortable: true, align: "right", cell: (r) => <span className="tabular-nums">${Number(r.products?.current_price ?? 0).toFixed(2)}</span> },
    { key: "zone", header: "Zone", accessor: (r) => r.zone, filter: "select", options: ["YELLOW", "ORANGE", "RED", "BLACK"], cell: (r) => <span className={`pill ${zoneClass[r.zone]}`}>{zoneEmoji[r.zone]} {r.zone}</span> },
    { key: "action", header: "Action", accessor: () => "", exportable: false, cell: (r) => (
      <div className="flex gap-1">
        <Button variant="outline" size="sm" className="text-xs h-7" disabled={proposeMutation.isPending} onClick={(e) => { e.stopPropagation(); proposeMutation.mutate([r.id]); }}>
          {r.zone === "RED" || r.zone === "BLACK" ? "Urgent Clear" : "Propose MD"}
        </Button>
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); navigate(`/batch/${r.id}`); }}>View</Button>
      </div>
    )},
  ];

  return (
    <>
      <PageHeader
        title="Near-Expiry Alerts"
        description="Monitor and act on stock approaching expiry across all stores. Auto-refreshes every 5 minutes."
      />
      <DataTable
        rows={enriched}
        columns={columns}
        rowKey={(r) => r.id}
        exportFilename="expiry-alerts"
        tableId="expiry"
        selectable
        bulkActions={[
          {
            label: "Propose Markdown",
            icon: <Tag className="h-3.5 w-3.5" />,
            onRun: (rows) => proposeMutation.mutate(rows.map(r => r.id)),
            disabled: () => proposeMutation.isPending,
          },
        ]}
        emptyMessage="No near-expiry items — all stock in green zone"
      />
    </>
  );
};

export default ExpiryAlerts;