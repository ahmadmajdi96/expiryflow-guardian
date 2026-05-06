import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Package, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { DataTable, DataTableColumn } from "@/components/DataTable";

const statusMap: Record<string, { cls: string; label: string }> = {
  DRAFT: { cls: "bg-muted/50 text-muted-foreground border-border", label: "Draft" },
  CONFIRMED: { cls: "bg-primary/10 text-primary border-primary/30", label: "Confirmed" },
  RECEIVING: { cls: "bg-warning/10 text-warning border-warning/30", label: "Receiving" },
  COMPLETED: { cls: "bg-success/10 text-success border-success/30", label: "Completed" },
  CANCELLED: { cls: "bg-destructive/10 text-destructive border-destructive/30", label: "Cancelled" },
};

const typeMap: Record<string, string> = { PURCHASE: "Purchase", RETURN: "Return", TRANSFER_IN: "Transfer In" };

const InboundOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ order_number: "", supplier_name: "", order_type: "PURCHASE", expected_date: "", notes: "" });
  const [lines, setLines] = useState<{ product_id: string; quantity_ordered: number }[]>([]);

  const { data: orders } = useQuery({
    queryKey: ["inbound-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inbound_orders")
        .select("*, inbound_order_lines(*, products(sku, name))")
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, sku, name").order("sku");
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.order_number) throw new Error("Order number required");
      const { data: order, error } = await supabase.from("inbound_orders").insert({
        order_number: form.order_number,
        supplier_name: form.supplier_name || null,
        order_type: form.order_type,
        expected_date: form.expected_date || null,
        notes: form.notes || null,
        created_by: user?.id,
      } as any).select("id").single();
      if (error) throw error;
      for (const line of lines) {
        await supabase.from("inbound_order_lines").insert({
          inbound_order_id: order.id,
          product_id: line.product_id,
          quantity_ordered: line.quantity_ordered,
        } as any);
      }
    },
    onSuccess: () => {
      toast.success("Inbound order created");
      queryClient.invalidateQueries({ queryKey: ["inbound-orders"] });
      setShowNew(false);
      setForm({ order_number: "", supplier_name: "", order_type: "PURCHASE", expected_date: "", notes: "" });
      setLines([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const advanceStatus = async (id: string, newStatus: string) => {
    await supabase.from("inbound_orders").update({ status: newStatus } as any).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["inbound-orders"] });
    toast.success(`Order status updated to ${newStatus}`);
  };

  const columns: DataTableColumn<any>[] = [
    { key: "order_number", header: "Order #", accessor: (r) => r.order_number, sortable: true, filter: "text", cell: (r) => <span className="font-mono text-xs font-semibold">{r.order_number}</span> },
    { key: "order_type", header: "Type", accessor: (r) => r.order_type, filter: "select", options: ["PURCHASE", "RETURN", "TRANSFER_IN"], cell: (r) => <Badge variant="outline">{typeMap[r.order_type] || r.order_type}</Badge> },
    { key: "supplier_name", header: "Supplier", accessor: (r) => r.supplier_name || "", sortable: true, filter: "text" },
    { key: "lines", header: "Lines", accessor: (r) => r.inbound_order_lines?.length ?? 0, align: "right", cell: (r) => <span className="tabular-nums">{r.inbound_order_lines?.length ?? 0}</span> },
    { key: "expected_date", header: "Expected", accessor: (r) => r.expected_date || "", sortable: true, filter: "date", cell: (r) => <span className="font-mono text-xs">{r.expected_date || "—"}</span> },
    { key: "status", header: "Status", accessor: (r) => r.status, filter: "select", options: ["DRAFT", "CONFIRMED", "RECEIVING", "COMPLETED", "CANCELLED"],
      cell: (r) => <Badge variant="outline" className={statusMap[r.status]?.cls || ""}>{statusMap[r.status]?.label || r.status}</Badge> },
    { key: "action", header: "Action", accessor: () => "", exportable: false, cell: (r) => {
      const next: Record<string, string> = { DRAFT: "CONFIRMED", CONFIRMED: "RECEIVING", RECEIVING: "COMPLETED" };
      const nextStatus = next[r.status];
      if (!nextStatus) return null;
      return <Button variant="outline" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); advanceStatus(r.id, nextStatus); }}>{nextStatus === "CONFIRMED" ? "Confirm" : nextStatus === "RECEIVING" ? "Start Receiving" : "Complete"}</Button>;
    }},
  ];

  return (
    <>
      <PageHeader
        title="Inbound Orders"
        description="Manage purchase orders, returns, and transfer-in orders with full status workflow."
        actions={<Button size="sm" onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-1" /> New Inbound Order</Button>}
      />
      <DataTable rows={orders ?? []} columns={columns} rowKey={(r) => r.id} exportFilename="inbound-orders" tableId="inbound" createdAtKey="created_at" emptyMessage="No inbound orders yet." />

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Inbound Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Order Number</Label><Input value={form.order_number} onChange={(e) => setForm({ ...form, order_number: e.target.value })} placeholder="IO-2026-001" className="font-mono" /></div>
              <div className="space-y-2"><Label>Type</Label>
                <Select value={form.order_type} onValueChange={(v) => setForm({ ...form, order_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PURCHASE">Purchase</SelectItem>
                    <SelectItem value="RETURN">Return</SelectItem>
                    <SelectItem value="TRANSFER_IN">Transfer In</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Supplier</Label><Input value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} placeholder="Supplier name" /></div>
              <div className="space-y-2"><Label>Expected Date</Label><Input type="date" value={form.expected_date} onChange={(e) => setForm({ ...form, expected_date: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label>Line Items</Label><Button variant="outline" size="sm" onClick={() => setLines([...lines, { product_id: "", quantity_ordered: 0 }])}><Plus className="h-3 w-3 mr-1" />Add Line</Button></div>
              {lines.map((line, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select value={line.product_id} onValueChange={(v) => { const n = [...lines]; n[i].product_id = v; setLines(n); }}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Product" /></SelectTrigger>
                      <SelectContent>{(products ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.sku} — {p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Input type="number" className="w-24 h-9" placeholder="Qty" value={line.quantity_ordered || ""} onChange={(e) => { const n = [...lines]; n[i].quantity_ordered = Number(e.target.value); setLines(n); }} />
                  <Button variant="ghost" size="sm" className="h-9 px-2 text-destructive" onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>{createMutation.isPending ? "Creating…" : "Create Order"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InboundOrders;