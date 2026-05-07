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
import { Plus, Trash2, ChevronDown, ChevronRight, Package, Calendar, MapPin, CheckCircle, ScanBarcode, Printer, AlertTriangle, ShieldAlert, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { getFEFOPickingSuggestion, type FEFOSuggestion } from "@/lib/fefo";
import { exportPickList, type PickListLine } from "@/lib/exporters";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [scanInput, setScanInput] = useState("");
  const [scannedPickLineIds, setScannedPickLineIds] = useState<Set<string>>(new Set());

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

  // Load outbound pick lines for the active picking order
  const { data: outboundPickLines, refetch: refetchPickLines } = useQuery({
    queryKey: ["outbound-pick-lines", pickingOrderId],
    queryFn: async () => {
      if (!pickingOrderId) return [];
      const order = (orders ?? []).find((o: any) => o.id === pickingOrderId);
      const lineIds = (order?.outbound_order_lines ?? []).map((l: any) => l.id);
      if (lineIds.length === 0) return [];
      const { data } = await supabase
        .from("outbound_pick_lines")
        .select("*, inventory_batches:batch_id(batch_number, expiry_date, location, quantity, qc_status, status)")
        .in("outbound_order_line_id", lineIds)
        .order("created_at");
      return (data ?? []) as any[];
    },
    enabled: !!pickingOrderId,
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
      setPickingOrderId(id);
      setPickingInProgress(true);
      setScannedPickLineIds(new Set());
      const order = (orders ?? []).find((o: any) => o.id === id);
      if (!order) return;
      const allocs: Record<string, FEFOSuggestion[]> = {};
      let blockedCount = 0;
      for (const line of order.outbound_order_lines ?? []) {
        const storeId = order.destination_store_id;
        if (storeId && line.product_id) {
          const suggestions = await getFEFOPickingSuggestion(line.product_id, storeId, line.quantity_ordered);
          allocs[line.id] = suggestions;
          // Create outbound_pick_lines and reserve inventory
          for (const sg of suggestions) {
            await supabase.from("outbound_pick_lines").insert({
              outbound_order_line_id: line.id,
              batch_id: sg.batchId,
              allocated_quantity: sg.quantity,
              location_type: sg.locationType,
              location_code: sg.location,
              status: "PENDING",
            } as any);
            // Reserve inventory
            const { data: batch } = await supabase.from("inventory_batches")
              .select("reserved_quantity, qc_status, status").eq("id", sg.batchId).single();
            if (batch?.qc_status !== "PASSED" || batch?.status !== "AVAILABLE") {
              blockedCount++;
              continue;
            }
            await supabase.from("inventory_batches").update({
              reserved_quantity: (batch?.reserved_quantity ?? 0) + sg.quantity,
            }).eq("id", sg.batchId);
          }
          // Update the order line with first batch reference
          if (suggestions.length > 0) {
            const totalAlloc = suggestions.reduce((s, sg) => s + sg.quantity, 0);
            await supabase.from("outbound_order_lines").update({
              batch_id: suggestions[0].batchId,
              quantity_picked: 0,
            } as any).eq("id", line.id);
          }
        }
      }
      setFefoAllocations(allocs);
      await supabase.from("outbound_orders").update({ status: "PICKING" } as any).eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["outbound-orders"] });
      setPickingInProgress(false);
      setExpandedOrderId(id);
      refetchPickLines();
      const msg = blockedCount > 0
        ? `FEFO allocation complete — ${blockedCount} batch(es) skipped (QC/quarantine blocked). Inventory reserved.`
        : "FEFO allocation complete — inventory reserved. Scan barcodes to confirm each pick.";
      toast.success(msg);
    } else {
      await supabase.from("outbound_orders").update({ status: newStatus } as any).eq("id", id);
      queryClient.invalidateQueries({ queryKey: ["outbound-orders"] });
      toast.success(`Order status updated to ${newStatus}`);
    }
  };

  const handleScanBarcode = async () => {
    if (!scanInput.trim() || !pickingOrderId) return;
    const sku = scanInput.trim();
    // Find matching pick line by batch_number or SKU
    const matchingLines = (outboundPickLines ?? []).filter((pl: any) =>
      pl.inventory_batches?.batch_number === sku && pl.status === "PENDING" && !scannedPickLineIds.has(pl.id)
    );
    // Also try matching by product SKU if no batch match
    let targetLine = matchingLines[0];
    if (!targetLine) {
      const order = (orders ?? []).find((o: any) => o.id === pickingOrderId);
      const orderLines = order?.outbound_order_lines ?? [];
      const matchingOrderLine = orderLines.find((ol: any) => ol.products?.sku === sku);
      if (matchingOrderLine) {
        targetLine = (outboundPickLines ?? []).find((pl: any) =>
          pl.outbound_order_line_id === matchingOrderLine.id && pl.status === "PENDING" && !scannedPickLineIds.has(pl.id)
        );
      }
    }
    if (!targetLine) {
      toast.error(`No pending pick line found for "${sku}". Already scanned or not in this order.`);
      setScanInput("");
      return;
    }
    // Validate batch is still eligible
    const batch = targetLine.inventory_batches;
    if (batch?.qc_status !== "PASSED") {
      toast.error(`⛔ Batch ${batch?.batch_number} is blocked — QC status: ${batch?.qc_status}`);
      setScanInput("");
      return;
    }
    if (batch?.status === "QUARANTINED" || batch?.status === "DEPLETED") {
      toast.error(`⛔ Batch ${batch?.batch_number} is ${batch?.status} — cannot pick.`);
      setScanInput("");
      return;
    }
    // Check expiry
    const daysLeft = batch?.expiry_date ? Math.ceil((new Date(batch.expiry_date).getTime() - Date.now()) / 86400000) : null;
    if (daysLeft !== null && daysLeft <= 0) {
      toast.error(`⛔ Batch ${batch?.batch_number} is EXPIRED. Raise an exception.`);
      setScanInput("");
      return;
    }
    if (daysLeft !== null && daysLeft <= 2) {
      toast.warning(`⚠️ Batch ${batch?.batch_number}: only ${daysLeft} days left (BLACK zone). Proceed with caution.`, { duration: 5000 });
    } else if (daysLeft !== null && daysLeft <= 7) {
      toast.warning(`⚠️ Batch ${batch?.batch_number}: ${daysLeft} days left (RED zone).`, { duration: 4000 });
    }
    // Mark as picked
    const pickQty = Math.min(targetLine.allocated_quantity, batch?.quantity ?? 0);
    await supabase.from("outbound_pick_lines").update({
      picked_quantity: pickQty,
      scanned_at: new Date().toISOString(),
      status: pickQty >= targetLine.allocated_quantity ? "PICKED" : "PARTIAL",
    } as any).eq("id", targetLine.id);
    setScannedPickLineIds(prev => new Set(prev).add(targetLine.id));
    setScanInput("");
    refetchPickLines();
    const partialNote = pickQty < targetLine.allocated_quantity ? ` (partial: ${pickQty}/${targetLine.allocated_quantity})` : "";
    toast.success(`✓ Scanned ${batch?.batch_number} — ${pickQty} units from ${targetLine.location_type}${partialNote}`);
  };

  const confirmPicking = async (orderId: string) => {
    const order = (orders ?? []).find((o: any) => o.id === orderId);
    const pickedLines = (outboundPickLines ?? []).filter((pl: any) => pl.status === "PICKED" || pl.status === "PARTIAL");
    if (pickedLines.length === 0) {
      toast.error("Scan at least one batch before confirming.");
      return;
    }
    // Deduct inventory and release reservations
    let totalPicked = 0;
    for (const pl of outboundPickLines ?? []) {
      const { data: batch } = await supabase.from("inventory_batches")
        .select("quantity, reserved_quantity").eq("id", pl.batch_id).single();
      if (batch && pl.picked_quantity > 0) {
        const remaining = Math.max(0, batch.quantity - pl.picked_quantity);
        const newReserved = Math.max(0, (batch.reserved_quantity ?? 0) - pl.allocated_quantity);
        await supabase.from("inventory_batches").update({
          quantity: remaining,
          reserved_quantity: newReserved,
          status: remaining <= 0 ? "DEPLETED" : "AVAILABLE",
        }).eq("id", pl.batch_id);
        totalPicked += pl.picked_quantity;
      } else if (batch) {
        // Release reservation for unpicked lines
        const newReserved = Math.max(0, (batch.reserved_quantity ?? 0) - pl.allocated_quantity);
        await supabase.from("inventory_batches").update({
          reserved_quantity: newReserved,
        }).eq("id", pl.batch_id);
      }
      await supabase.from("fefo_allocation_log").insert({
        batch_id: pl.batch_id,
        allocation_type: "OUTBOUND_PICK",
        location_type: pl.location_type,
        location_code: pl.location_code || "UNKNOWN",
        quantity: pl.picked_quantity,
        allocated_by: user?.id,
      });
    }
    // Update order line picked quantities
    for (const ol of order?.outbound_order_lines ?? []) {
      const olPicks = (outboundPickLines ?? []).filter((pl: any) => pl.outbound_order_line_id === ol.id);
      const linePicked = olPicks.reduce((s: number, pl: any) => s + (pl.picked_quantity ?? 0), 0);
      await supabase.from("outbound_order_lines").update({
        quantity_picked: linePicked,
      } as any).eq("id", ol.id);
    }
    await supabase.from("outbound_orders").update({ status: "SHIPPED" } as any).eq("id", orderId);
    setPickingOrderId(null);
    setFefoAllocations({});
    setScannedPickLineIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["outbound-orders"] });
    toast.success(`Picking confirmed — ${totalPicked} units deducted from inventory.`);
  };

  const handlePrintPickList = (orderId: string) => {
    const order = (orders ?? []).find((o: any) => o.id === orderId);
    if (!order) return;
    const pickLineData: PickListLine[] = [];
    for (const ol of order.outbound_order_lines ?? []) {
      const olPicks = (outboundPickLines ?? []).filter((pl: any) => pl.outbound_order_line_id === ol.id);
      if (olPicks.length > 0) {
        for (const pl of olPicks) {
          pickLineData.push({
            sku: ol.products?.sku || "—",
            productName: ol.products?.name || "—",
            batchNumber: pl.inventory_batches?.batch_number || "—",
            expiryDate: pl.inventory_batches?.expiry_date || "—",
            location: pl.location_code || "—",
            locationType: pl.location_type || "—",
            allocated: pl.allocated_quantity,
            picked: pl.picked_quantity,
            status: pl.status,
          });
        }
      } else {
        // Fallback for lines without outbound_pick_lines
        const batch = ol.inventory_batches;
        pickLineData.push({
          sku: ol.products?.sku || "—",
          productName: ol.products?.name || "—",
          batchNumber: batch?.batch_number || "—",
          expiryDate: batch?.expiry_date || "—",
          location: batch?.location || "—",
          locationType: "—",
          allocated: ol.quantity_ordered,
          picked: ol.quantity_picked,
          status: ol.quantity_picked >= ol.quantity_ordered ? "PICKED" : "PENDING",
        });
      }
    }
    exportPickList(order.order_number, order.customer_name || "", pickLineData);
    toast.success("Pick list exported.");
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
      const labels: Record<string, string> = { CONFIRMED: "Confirm", PICKING: "FEFO Pick", SHIPPED: "Ship", DELIVERED: "Deliver" };
      if (r.status === "PICKING" && pickingOrderId === r.id) {
        return (
          <div className="flex gap-1">
            <Button size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); confirmPicking(r.id); }}><CheckCircle className="h-3 w-3 mr-1" />Confirm</Button>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); handlePrintPickList(r.id); }}><Printer className="h-3 w-3" /></Button>
          </div>
        );
      }
      if (r.status === "SHIPPED" || r.status === "DELIVERED") {
        return <Button variant="outline" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); handlePrintPickList(r.id); }}><Printer className="h-3 w-3 mr-1" />Pick List</Button>;
      }
      if (!nextStatus) return null;
      return <Button variant="outline" size="sm" className="text-xs h-7" disabled={pickingInProgress} onClick={(e) => { e.stopPropagation(); advanceStatus(r.id, nextStatus); }}>{pickingInProgress && nextStatus === "PICKING" ? "Allocating…" : labels[nextStatus] || nextStatus}</Button>;
    }},
  ];

  const renderExpandedRow = (order: any) => {
    if (expandedOrderId !== order.id) return null;
    const orderLines = order.outbound_order_lines ?? [];
    const isActivePick = pickingOrderId === order.id;
    const pickLinesForOrder = outboundPickLines ?? [];
    return (
      <div className="p-4 bg-muted/20 border-t border-border space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Line Items — FEFO Allocation Detail</h4>
          {isActivePick && (
            <div className="flex items-center gap-1">
              <Lock className="h-3 w-3 text-warning" />
              <span className="text-xs text-warning font-semibold">Inventory reserved</span>
            </div>
          )}
        </div>
        {/* Barcode scanning when actively picking */}
        {isActivePick && (
          <div className="flex gap-2 items-center p-3 rounded-lg border border-primary/30 bg-primary/5">
            <ScanBarcode className="h-5 w-5 text-primary" />
            <Input
              placeholder="Scan batch number or SKU…"
              className="font-mono flex-1"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScanBarcode()}
              autoFocus
            />
            <Button onClick={handleScanBarcode} size="sm">Scan</Button>
          </div>
        )}
        {orderLines.length === 0 && <p className="text-sm text-muted-foreground">No line items.</p>}
        {orderLines.map((line: any) => {
          const linePicks = pickLinesForOrder.filter((pl: any) => pl.outbound_order_line_id === line.id);
          const totalLinePicked = linePicks.reduce((s: number, pl: any) => s + (pl.picked_quantity ?? 0), 0);
          const totalLineAllocated = linePicks.reduce((s: number, pl: any) => s + (pl.allocated_quantity ?? 0), 0);
          const allScanned = linePicks.length > 0 && linePicks.every((pl: any) => pl.status === "PICKED" || pl.status === "PARTIAL");
          const zoneClass: Record<string, string> = { GREEN: "bg-success/10 text-success", YELLOW: "bg-warning/10 text-warning", ORANGE: "bg-orange-100 text-orange-700", RED: "bg-destructive/10 text-destructive", BLACK: "bg-foreground/10 text-foreground" };
          return (
            <div key={line.id} className={`rounded-lg border p-3 space-y-2 ${allScanned ? "border-success/30 bg-success/5" : "border-border"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {allScanned && <CheckCircle className="h-4 w-4 text-success" />}
                  <span className="font-semibold text-sm">{line.products?.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{line.products?.sku}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Ordered:</span>
                  <span className="tabular-nums font-semibold text-sm">{line.quantity_ordered}</span>
                  {linePicks.length > 0 && (
                    <>
                      <span className="text-xs text-muted-foreground">Allocated:</span>
                      <span className="tabular-nums font-semibold text-sm">{totalLineAllocated}</span>
                      <span className="text-xs text-muted-foreground">Picked:</span>
                      <span className={`tabular-nums font-semibold text-sm ${totalLinePicked >= totalLineAllocated ? "text-success" : ""}`}>{totalLinePicked}</span>
                    </>
                  )}
                </div>
              </div>
              {/* Show multi-batch FEFO allocation breakdown */}
              {linePicks.length > 0 && (
                <div className="space-y-1">
                  {linePicks.map((pl: any) => {
                    const b = pl.inventory_batches;
                    const daysLeft = b?.expiry_date ? Math.ceil((new Date(b.expiry_date).getTime() - Date.now()) / 86400000) : null;
                    const zone = daysLeft !== null ? (daysLeft <= 2 ? "BLACK" : daysLeft <= 7 ? "RED" : daysLeft <= 14 ? "ORANGE" : daysLeft <= 30 ? "YELLOW" : "GREEN") : null;
                    const isBlocked = b?.qc_status !== "PASSED" || b?.status === "QUARANTINED";
                    return (
                      <div key={pl.id} className={`flex items-center gap-2 text-xs p-2 rounded border ${pl.status === "PICKED" ? "bg-success/5 border-success/30" : pl.status === "PARTIAL" ? "bg-warning/5 border-warning/30" : isBlocked ? "bg-destructive/5 border-destructive/30" : "bg-background border-border"}`}>
                        {pl.status === "PICKED" ? <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" /> :
                         pl.status === "PARTIAL" ? <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" /> :
                         isBlocked ? <ShieldAlert className="h-3.5 w-3.5 text-destructive shrink-0" /> :
                         <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                        <Badge variant="outline" className={pl.location_type === "PICKFACE" ? "bg-success/10 text-success border-success/30" : "bg-primary/10 text-primary border-primary/30"}>{pl.location_type}</Badge>
                        <Link to={`/batch/${pl.batch_id}`} className="font-mono font-semibold text-primary hover:underline">{b?.batch_number || "—"}</Link>
                        <span className="flex items-center gap-1 text-muted-foreground"><Calendar className="h-3 w-3" />{b?.expiry_date}</span>
                        {daysLeft !== null && <span className="tabular-nums">{daysLeft}d</span>}
                        {zone && <Badge variant="outline" className={`text-[10px] py-0 ${zoneClass[zone] || ""}`}>{zone}</Badge>}
                        {isBlocked && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px] py-0">QC BLOCKED</Badge>}
                        <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" />{pl.location_code || "—"}</span>
                        <span className="ml-auto font-semibold tabular-nums">{pl.picked_quantity}/{pl.allocated_quantity}</span>
                        <Badge variant="outline" className={`text-[10px] py-0 ${pl.status === "PICKED" ? "text-success" : pl.status === "PARTIAL" ? "text-warning" : ""}`}>{pl.status}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
              {linePicks.length === 0 && <p className="text-xs text-muted-foreground italic">No batch allocated yet. Start FEFO picking to assign batches.</p>}
            </div>
          );
        })}
        {/* Picking summary */}
        {isActivePick && pickLinesForOrder.length > 0 && (() => {
          const totalAlloc = pickLinesForOrder.reduce((s: number, pl: any) => s + pl.allocated_quantity, 0);
          const totalPicked = pickLinesForOrder.reduce((s: number, pl: any) => s + pl.picked_quantity, 0);
          const pendingCount = pickLinesForOrder.filter((pl: any) => pl.status === "PENDING").length;
          return (
            <Alert className="border-primary/30 bg-primary/5">
              <AlertDescription className="flex items-center justify-between text-sm">
                <span>Progress: <strong>{totalPicked}/{totalAlloc}</strong> units picked across <strong>{pickLinesForOrder.length}</strong> batch allocations ({pendingCount} pending)</span>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" disabled={totalPicked === 0} onClick={() => confirmPicking(order.id)}>
                    <CheckCircle className="h-3 w-3 mr-1" />{totalPicked < totalAlloc ? `Confirm Partial (${totalPicked}/${totalAlloc})` : "Confirm Pick"}
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handlePrintPickList(order.id)}>
                    <Printer className="h-3 w-3 mr-1" />Print
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          );
        })()}
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