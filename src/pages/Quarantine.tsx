import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DataTableFilter, { matchesSearch } from "@/components/DataTableFilter";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Quarantine = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: batches, isLoading } = useQuery({
    queryKey: ["quarantine-batches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inventory_batches")
        .select("*, products(sku, name), stores(store_code)")
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
    onSuccess: () => {
      toast.success("Batch written off.");
      queryClient.invalidateQueries({ queryKey: ["quarantine-batches"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (batches ?? []).filter((b: any) =>
    matchesSearch(b, search, ["batch_number", "products.sku", "products.name", "stores.store_code"])
  );

  return (
    <>
      <PageHeader
        title="Quarantine Management"
        description="Quarantined stock is excluded from sale, markdown proposals, and picking."
        badge={<Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">{filtered.length} items</Badge>}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate("/qc-inspection")}>QC Inspection</Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <DataTableFilter value={search} onChange={setSearch} placeholder="Search batch, SKU, product…" />
      </div>

      <div className="page-section">
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
                <th className="px-5 py-3 font-medium text-muted-foreground">Date</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q: any) => (
                <tr key={q.id} className="table-row-hover border-b border-border/50">
                  <td className="px-5 py-3 font-mono text-xs cursor-pointer hover:text-primary" onClick={() => navigate(`/batch/${q.id}`)}>{q.batch_number}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium">{q.products?.name}</div>
                    <div className="text-xs text-muted-foreground">{q.products?.sku}</div>
                  </td>
                  <td className="px-5 py-3">{q.stores?.store_code}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{q.quantity}</td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">{q.qc_status}</Badge>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">{q.received_at?.slice(0, 10)}</td>
                  <td className="px-5 py-3 space-x-1">
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => releaseMutation.mutate(q.id)} disabled={releaseMutation.isPending}>Release</Button>
                    <Button variant="outline" size="sm" className="text-xs h-7 text-destructive" onClick={() => writeOffMutation.mutate(q.id)} disabled={writeOffMutation.isPending}>Write-Off</Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">No quarantined items</td></tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </>
  );
};

export default Quarantine;