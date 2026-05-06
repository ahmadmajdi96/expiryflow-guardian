import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DataTable, DataTableColumn } from "@/components/DataTable";

const Quarantine = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: batches } = useQuery({
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
      <div className="space-x-1">
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
      />
    </>
  );
};

export default Quarantine;