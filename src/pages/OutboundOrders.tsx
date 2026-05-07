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
import { Plus, Trash2, ChevronDown, ChevronRight, Package, Calendar, MapPin, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { getFEFOPickingSuggestion, type FEFOSuggestion } from "@/lib/fefo";
import { Link } from "react-router-dom";

const statusMap: Record<string, { cls: string; label: string }> = {
  DRAFT: { cls: "bg-muted/50 text-muted-foreground border-border", label: "Draft" },
  CONFIRMED: { cls: "bg-primary/10 text-primary border-primary/30", label: "Confirmed" },
  PICKING: { cls: "bg-warning/10 text-warning border-warning/30", label: "Picking" },
  SHIPPED: { cls: "bg-info/10 text-info border-info/30", label: "Shipped" },
  DELIVERED: { cls: "bg-success/10 text-success border-success/30", label: "Delivered" },
  CANCELLED: { cls: "bg-destructive/10 text-destructive border-destructive/30", label: "Cancelled" },
};

const typeMap: Record<string, string> = { SALE: "Sale", TRANSFER_OUT: "Transfer Out", RETURN_TO_SUPPLIER: "Return to Supplier" };

const OutboundOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ order_number: "", customer_name: "", order_type: "SALE", ship_date: "", destination_store_id: "", notes: "" });
  const [lines, setLines] = useState<{ product_id: string; quantity_ordered: number }[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [pickingOrderId, setPickingOrderId] = useState<string | null>(null);
  const [fefoAllocations, setFefoAllocations] = useState<Record<string, FEFOSuggestion[]>>({});
  const [pickingInProgress, setPickingInProgress] = useState(false);

  const { data: orders } = useQuery({
    queryKey: ["outbound-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("outbound_orders")
        .select("*, outbound_order_lines!outbound_order_lines_outbound_order_id_fkey(*, products!outbound_order_lines_product_id_fkey(sku, name), inventory_batches:batch_id(batch_number, expiry_date, location, quantity)), stores:destination_store_id(store_code)")
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

  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data } = await supabase.from("stores").select("id, store_code, name").order("store_code");
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.order_number) throw new Error("Order number required");
      const { data: order, error } = await supabase.from("outbound_orders").insert({
        order_number: form.order_number,
        customer_name: form.customer_name || null,
        order_type: form.order_type,
        ship_date: form.ship_date || null,
        destination_store_id: form.destination_store_id || null,
        notes: form.notes || null,
        created_by: user?.id,
      } as any).select("id").single();
      if (error) throw error;
      for (const line of lines) {
        await supabase.from("outbound_order_lines").insert({
          outbound_order_id: order.id,
          product_id: line.product_id,
          quantity_ordered: line.quantity_ordered,
        } as any);
      }
    },
    onSuccess: () => {
      toast.success("Outbound order created");
      queryClient.invalidateQueries({ queryKey: ["outbound-orders"] });
      setShowNew(false);
      setForm({ order_number: "", customer_name: "", order_type: "SALE", ship_date: "", destination_store_id: "", notes: "" });
      setLines([]);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const advanceStatus = async (id: string, newStatus: string) => {
    if (newStatus === "PICKING") {
      // Trigger FEFO allocation for all lines
      setPickingOrderId(id);
      setPickingInProgress(true);
      const order = (orders ?? []).find((o: any) => o.id === id);
      if (!order) return;
      const allocs: Record<string, FEFOSuggestion[]> = {};
      for (const line of order.outbound_order_lines ?? []) {
        const storeId = order.destination_store_id;
        if (storeId && line.product_id) {
          const suggestions = await getFEFOPickingSuggestion(line.product_id, storeId, line.quantity_ordered);
          allocs[line.id] = suggestions;
          // Assign first batch to line
          if (suggestions.length > 0) {
            await supabase.from("outbound_order_lines").update({
              batch_id: suggestions[0].batchId,
              quantity_picked: suggestions.reduce((s, sg) => s + sg.quantity, 0),
            } as any).eq("id", line.id);
          }
        }
      }
      setFefoAllocations(allocs);
      await supabase.from("outbound_orders").update({ status: "PICKING" } as any).eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["outbound-orders"] });
      setPickingInProgress(false);
      setExpandedOrderId(id);
      toast.success("FEFO allocation complete — batches assigned to each line.");
    } else {
      await supabase.from("outbound_orders").update({ status: newStatus } as any).eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["outbound-orders"] });
      toast.success(`Order status updated to ${newStatus}`);
    }
  };

  const confirmPicking = async (orderId: string) => {
    await supabase.from("outbound_orders").update({ status: "SHIPPED" } as any).eq("id", orderId);
    // Deduct inventory for each allocated batch
    const order = (orders ?? []).find((o: any) => o.id === orderId);
    for (const line of order?.outbound_order_lines ?? []) {
      const lineAllocs = fefoAllocations[line.id] ?? [];
      for (const alloc of lineAllocs) {
        const { data: batch } = await supabase.from("inventory_batches").select("quantity").eq("id", alloc.batchId).single();
        if (batch) {
          const remaining = Math.max(0, batch.quantity - alloc.quantity);
          await supabase.from("inventory_batches").update({
            quantity: remaining,
            status: remaining <= 0 ? "DEPLETED" : "AVAILABLE",
          }).eq("id", alloc.batchId);
        }
        await supabase.from("fefo_allocation_log").insert({
          batch_id: alloc.batchId,
          allocation_type: "OUTBOUND_PICK",
          location_type: alloc.locationType,
          location_code: alloc.location || "UNKNOWN",
          quantity: alloc.quantity,
          allocated_by: user?.id,
        });
      }
    }
    setPickingOrderId(null);
    setFefoAllocations({});
    queryClient.invalidateQueries({ queryKey: ["outbound-orders"] });
    toast.success("Picking confirmed and inventory deducted.");
  };

  const columns: DataTableColumn<any>[] = [
    { key: "expand", header: "", accessor: () => "", exportable: false, cell: (r) => (
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); setExpandedOrderId(expandedOrderId === r.id ? null : r.id); }}>
        {expandedOrderId === r.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>
    )},
    { key: "order_number", header: "Order #", accessor: (r) => r.order_number, sortable: true, filter: "text", cell: (r) => <span className="font-mono text-xs font-semibold">{r.order_number}</span> },
    { key: "order_type", header: "Type", accessor: (r) => r.order_type, filter: "select", options: ["SALE", "TRANSFER_OUT", "RETURN_TO_SUPPLIER"], cell: (r) => <Badge variant="outline">{typeMap[r.order_type] || r.order_type}</Badge> },
    { key: "customer_name", header: "Customer", accessor: (r) => r.customer_name || "", sortable: true, filter: "text" },
    { key: "destination", header: "Destination", accessor: (r) => (r as any).stores?.store_code || "", filter: "text", cell: (r) => <span className="font-mono text-xs">{(r as any).stores?.store_code || "—"}</span> },
    { key: "lines", header: "Lines", accessor: (r) => r.outbound_order_lines?.length ?? 0, align: "right", cell: (r) => <span className="tabular-nums">{r.outbound_order_lines?.length ?? 0}</span> },
    { key: "ship_date", header: "Ship Date", accessor: (r) => r.ship_date || "", sortable: true, filter: "date", cell: (r) => <span className="font-mono text-xs">{r.ship_date || "—"}</span> },
    { key: "status", header: "Status", accessor: (r) => r.status, filter: "select", options: ["DRAFT", "CONFIRMED", "PICKING", "SHIPPED", "DELIVERED", "CANCELLED"],
      cell: (r) => <Badge variant="outline" className={statusMap[r.status]?.cls || ""}>{statusMap[r.status]?.label || r.status}</Badge> },
    { key: "action", header: "Action", accessor: () => "", exportable: false, cell: (r) => {
      const next: Record<string, string> = { DRAFT: "CONFIRMED", CONFIRMED: "PICKING", PICKING: "SHIPPED", SHIPPED: "DELIVERED" };
      const nextStatus = next[r.status];
      if (!nextStatus) return null;
      const labels: Record<string, string> = { CONFIRMED: "Confirm", PICKING: "FEFO Pick", SHIPPED: "Ship", DELIVERED: "Deliver" };
      if (r.status === "PICKING" && pickingOrderId === r.id) {
        return <Button size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); confirmPicking(r.id); }}><CheckCircle className="h-3 w-3 mr-1" />Confirm Pick</Button>;
      }
      return <Button variant="outline" size="sm" className="text-xs h-7" disabled={pickingInProgress} onClick={(e) => { e.stopPropagation(); advanceStatus(r.id, nextStatus); }}>{pickingInProgress && nextStatus === "PICKING" ? "Allocating…" : labels[nextStatus] || nextStatus}</Button>;
    }},
  ];

  const renderExpandedRow = (order: any) => {
    if (expandedOrderId !== order.id) return null;
    const orderLines = order.outbound_order_lines ?? [];
    const lineAllocs = fefoAllocations;
    return (
      <div className="p-4 bg-muted/20 border-t border-border space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Line Items — FEFO Allocation Detail</h4>
        {orderLines.length === 0 && <p className="text-sm text-muted-foreground">No line items.</p>}
        {orderLines.map((line: any) => {
          const allocs = lineAllocs[line.id] ?? [];
          const batch = line.inventory_batches;
          const daysLeft = batch?.expiry_date ? Math.ceil((new Date(batch.expiry_date).getTime() - Date.now()) / 86400000) : null;
          const zone = daysLeft !== null ? (daysLeft <= 2 ? "BLACK" : daysLeft <= 7 ? "RED" : daysLeft <= 14 ? "ORANGE" : daysLeft <= 30 ? "YELLOW" : "GREEN") : null;
          const zoneClass: Record<string, string> = { GREEN: "bg-success/10 text-success", YELLOW: "bg-warning/10 text-warning", ORANGE: "bg-orange-100 text-orange-700", RED: "bg-destructive/10 text-destructive", BLACK: "bg-foreground/10 text-foreground" };
          return (
            <div key={line.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{line.products?.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{line.products?.sku}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Ordered:</span>
                  <span className="tabular-nums font-semibold text-sm">{line.quantity_ordered}</span>
                  <span className="text-xs text-muted-foreground">Picked:</span>
                  <span className="tabular-nums font-semibold text-sm">{line.quantity_picked}</span>
                </div>
              </div>
              {/* Show assigned batch */}
              {batch && (
                <div className="flex items-center gap-3 p-2 rounded bg-muted/40 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <Link to={`/batch/${line.batch_id}`} className="font-mono text-xs font-semibold text-primary hover:underline">{batch.batch_number}</Link>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" />{batch.expiry_date}</span>
                  {daysLeft !== null && <span className="text-xs tabular-nums">{daysLeft}d left</span>}
                  {zone && <Badge variant="outline" className={`text-xs ${zoneClass[zone] || ""}`}>{zone}</Badge>}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{batch.location || "—"}</span>
                </div>
              )}
              {/* Show FEFO allocation breakdown if we just did picking */}
              {allocs.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-semibold">FEFO Allocation (earliest expiry first):</p>
                  {allocs.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded bg-background border border-border">
                      <Badge variant="outline" className={a.locationType === "PICKFACE" ? "bg-success/10 text-success border-success/30" : "bg-primary/10 text-primary border-primary/30"}>{a.locationType}</Badge>
                      <Link to={`/batch/${a.batchId}`} className="font-mono font-semibold text-primary hover:underline">{a.batchNumber}</Link>
                      <span className="text-muted-foreground">Exp: {a.expiryDate}</span>
                      <span className="text-muted-foreground">@ {a.location || "—"}</span>
                      <span className="ml-auto font-semibold tabular-nums">{a.quantity} units</span>
                    </div>
                  ))}
                </div>
              )}
              {!batch && allocs.length === 0 && <p className="text-xs text-muted-foreground italic">No batch allocated yet. Start picking to assign FEFO batches.</p>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Outbound Orders"
        description="Manage sales orders, transfer-out, and return-to-supplier orders."
        actions={<Button size="sm" onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-1" /> New Outbound Order</Button>}
      />
      <DataTable rows={orders ?? []} columns={columns} rowKey={(r) => r.id} exportFilename="outbound-orders" tableId="outbound" createdAtKey="created_at" emptyMessage="No outbound orders yet." expandedRowRender={renderExpandedRow} />

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Outbound Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Order Number</Label><Input value={form.order_number} onChange={(e) => setForm({ ...form, order_number: e.target.value })} placeholder="OO-2026-001" className="font-mono" /></div>
              <div className="space-y-2"><Label>Type</Label>
                <Select value={form.order_type} onValueChange={(v) => setForm({ ...form, order_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SALE">Sale</SelectItem>
                    <SelectItem value="TRANSFER_OUT">Transfer Out</SelectItem>
                    <SelectItem value="RETURN_TO_SUPPLIER">Return to Supplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Customer</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="Customer name" /></div>
              <div className="space-y-2"><Label>Ship Date</Label><Input type="date" value={form.ship_date} onChange={(e) => setForm({ ...form, ship_date: e.target.value })} /></div>
              <div className="col-span-2 space-y-2"><Label>Destination Store</Label>
                <Select value={form.destination_store_id} onValueChange={(v) => setForm({ ...form, destination_store_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {(stores ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.store_code} — {s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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

export default OutboundOrders;