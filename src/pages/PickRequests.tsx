import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ScanBarcode, CheckCircle, Package, AlertTriangle, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { getFEFOPickingSuggestion, type FEFOSuggestion } from "@/lib/fefo";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const statusMap: Record<string, { cls: string; label: string }> = {
  PENDING: { cls: "bg-warning/10 text-warning border-warning/30", label: "Pending" },
  PICKING: { cls: "bg-info/10 text-info border-info/30", label: "Picking" },
  COMPLETED: { cls: "bg-success/10 text-success border-success/30", label: "Completed" },
  CANCELLED: { cls: "bg-destructive/10 text-destructive border-destructive/30", label: "Cancelled" },
  PARTIAL: { cls: "bg-accent/10 text-accent-foreground border-accent/30", label: "Partial" },
};

const PickRequests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [productId, setProductId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [qty, setQty] = useState("");
  const [suggestions, setSuggestions] = useState<FEFOSuggestion[]>([]);
  // Picking state
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [pickLines, setPickLines] = useState<any[]>([]);
  const [scanInput, setScanInput] = useState("");
  const [exceptionLine, setExceptionLine] = useState<any>(null);
  const [exceptionType, setExceptionType] = useState("REVIEW");
  const [exceptionReason, setExceptionReason] = useState("");
  const [showExceptions, setShowExceptions] = useState(false);
  const [scannedLineIds, setScannedLineIds] = useState<Set<string>>(new Set());

  const { data: picks } = useQuery({
    queryKey: ["pick-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pick_requests")
        .select("*, products(sku, name), stores(store_code)")
        .order("created_at", { ascending: false })
        .limit(50);
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
    if (!productId || !storeId || !qty) return;
    const result = await getFEFOPickingSuggestion(productId, storeId, Number(qty));
    setSuggestions(result);
    if (result.length === 0) toast.info("No eligible batches found.");
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (suggestions.length === 0) throw new Error("No FEFO suggestions");
      const pickCode = `PICK-${Date.now().toString(36).toUpperCase()}`;
      const totalAllocated = suggestions.reduce((s, sg) => s + sg.quantity, 0);

      const { data: pickReq, error } = await supabase.from("pick_requests").insert({
        pick_code: pickCode,
        product_id: productId,
        store_id: storeId,
        requested_quantity: Number(qty),
        status: "PENDING",
        requested_by: user?.id,
      }).select("id").single();
      if (error) throw error;

      for (const sg of suggestions) {
        await supabase.from("pick_request_lines").insert({
          pick_request_id: pickReq.id,
          batch_id: sg.batchId,
          allocated_quantity: sg.quantity,
          location_type: sg.locationType,
          location_code: sg.location,
        });
      }
      return pickReq.id;
    },
    onSuccess: () => {
      toast.success("Pick request created with FEFO allocation.");
      queryClient.invalidateQueries({ queryKey: ["pick-requests"] });
      setShowNew(false);
      setSuggestions([]);
      setQty("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleStartPicking = async (pickId: string) => {
    await supabase.from("pick_requests").update({ status: "PICKING" }).eq("id", pickId);
    const { data: lines } = await supabase
      .from("pick_request_lines")
      .select("*, inventory_batches:batch_id(batch_number, location, expiry_date)")
      .eq("pick_request_id", pickId)
      .order("created_at");
    setPickingId(pickId);
    setPickLines(lines ?? []);
    queryClient.invalidateQueries({ queryKey: ["pick-requests"] });
  };

  const handleScanBatch = async () => {
    if (!scanInput || !pickingId) return;
    // Block wrong batch (not in pick at all)
    const anyMatch = pickLines.find((l: any) => l.inventory_batches?.batch_number === scanInput);
    if (!anyMatch) {
      toast.error(`Batch ${scanInput} is not part of this pick request.`);
      setScanInput("");
      return;
    }
    // Block duplicate scans
    const alreadyScanned = pickLines.find((l: any) =>
      l.inventory_batches?.batch_number === scanInput && scannedLineIds.has(l.id)
    );
    if (alreadyScanned) {
      toast.error(`Batch ${scanInput} already scanned.`);
      setScanInput("");
      return;
    }
    const line = pickLines.find((l: any) =>
      l.inventory_batches?.batch_number === scanInput && l.picked_quantity < l.allocated_quantity && !scannedLineIds.has(l.id)
    );
    if (!line) {
      toast.error(`Batch ${scanInput} already fully picked.`);
      setScanInput("");
      return;
    }
    // Check actual available stock for partial pick support
    const { data: batch } = await supabase.from("inventory_batches").select("quantity").eq("id", line.batch_id).single();
    const available = batch?.quantity ?? 0;
    const newPickedQty = Math.min(line.allocated_quantity, available);
    if (newPickedQty === 0) {
      toast.warning(`Batch ${scanInput} has 0 stock. Use Exception to flag it.`);
      setScanInput("");
      return;
    }
    await supabase.from("pick_request_lines").update({
      picked_quantity: newPickedQty,
      scanned_at: new Date().toISOString(),
    }).eq("id", line.id);

    // Deduct from inventory batch
    const remaining = available - newPickedQty;
    await supabase.from("inventory_batches").update({
      quantity: remaining <= 0 ? 0 : remaining,
      status: remaining <= 0 ? "DEPLETED" : "AVAILABLE",
    }).eq("id", line.batch_id);

    // Log FEFO allocation
    await supabase.from("fefo_allocation_log").insert({
      batch_id: line.batch_id,
      allocation_type: "PICK",
      location_type: line.location_type,
      location_code: line.location_code || "UNKNOWN",
      quantity: newPickedQty,
      allocated_by: user?.id,
    });

    // Refresh lines
    const { data: updatedLines } = await supabase
      .from("pick_request_lines")
      .select("*, inventory_batches:batch_id(batch_number, location, expiry_date)")
      .eq("pick_request_id", pickingId)
      .order("created_at");
    setPickLines(updatedLines ?? []);
    setScannedLineIds(prev => new Set(prev).add(line.id));
    setScanInput("");
    const partialNote = newPickedQty < line.allocated_quantity ? ` (partial: ${newPickedQty}/${line.allocated_quantity})` : "";
    toast.success(`Scanned batch ${scanInput} — ${newPickedQty} units from ${line.location_type}${partialNote}`);
  };

  const handleCompletePick = async () => {
    if (!pickingId) return;
    const totalPicked = pickLines.reduce((s: number, l: any) => s + (l.picked_quantity || 0), 0);
    const totalAlloc = pickLines.reduce((s: number, l: any) => s + l.allocated_quantity, 0);
    const isPartial = totalPicked < totalAlloc;
    await supabase.from("pick_requests").update({
      status: isPartial ? "PARTIAL" : "COMPLETED",
      fulfilled_quantity: totalPicked,
      completed_at: new Date().toISOString(),
    }).eq("id", pickingId);
    toast.success(isPartial ? `Partial pick — ${totalPicked}/${totalAlloc} fulfilled.` : "Pick completed!");
    setPickingId(null);
    setPickLines([]);
    setScannedLineIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["pick-requests"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-batches"] });
  };

  const canComplete = scannedLineIds.size > 0;
  const totalPicked = pickLines.reduce((s: number, l: any) => s + (l.picked_quantity || 0), 0);
  const totalAllocated = pickLines.reduce((s: number, l: any) => s + l.allocated_quantity, 0);

  const handleRaiseException = async () => {
    if (!exceptionLine || !pickingId || !exceptionReason) return;
    await supabase.from("pick_exceptions").insert({
      pick_request_id: pickingId,
      original_line_id: exceptionLine.id,
      batch_id: exceptionLine.batch_id,
      exception_type: exceptionType,
      reason: exceptionReason,
      status: "OPEN",
      created_by: user?.id,
    });
    await supabase.from("pick_request_lines").update({ picked_quantity: 0, scanned_at: new Date().toISOString() }).eq("id", exceptionLine.id);
    setScannedLineIds(prev => new Set(prev).add(exceptionLine.id));
    const { data: updatedLines } = await supabase
      .from("pick_request_lines")
      .select("*, inventory_batches:batch_id(batch_number, location, expiry_date)")
      .eq("pick_request_id", pickingId)
      .order("created_at");
    setPickLines(updatedLines ?? []);
    setExceptionLine(null);
    setExceptionReason("");
    toast.success(`Exception raised — ${exceptionType}`);
    queryClient.invalidateQueries({ queryKey: ["pick-exceptions", pickingId] });
  };

  const { data: exceptions } = useQuery({
    queryKey: ["pick-exceptions", pickingId],
    queryFn: async () => {
      if (!pickingId) return [];
      const { data } = await supabase
        .from("pick_exceptions")
        .select("*, inventory_batches:batch_id(batch_number)")
        .eq("pick_request_id", pickingId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!pickingId,
  });

  return (
    <>
      <PageHeader
        title="Pick Requests"
        description="FEFO-based picking — earliest-expiry batches allocated first, PICKFACE before RESERVE."
        actions={<Button size="sm" onClick={() => setShowNew(!showNew)}><Plus className="h-4 w-4 mr-1" /> New Pick</Button>}
      />

      {/* Picking mode */}
      {pickingId && (
        <div className="page-section p-5 mb-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><ScanBarcode className="h-5 w-5 text-primary" /> Scanning Mode</h3>
          <p className="text-sm text-muted-foreground">Scan each batch barcode in order. FEFO ensures PICKFACE batches are picked first, then RESERVE.</p>
          <div className="flex gap-2">
            <Input
              placeholder="Scan batch number…"
              className="font-mono"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScanBatch()}
            />
            <Button onClick={handleScanBatch}>Scan</Button>
          </div>
          <div className="space-y-2">
            {pickLines.map((l: any) => (
              <div key={l.id} className={`flex items-center justify-between p-3 rounded-lg border ${l.picked_quantity >= l.allocated_quantity ? "border-success/30 bg-success/5" : l.picked_quantity > 0 ? "border-warning/30 bg-warning/5" : scannedLineIds.has(l.id) ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
                <div className="flex items-center gap-3">
                  {l.picked_quantity >= l.allocated_quantity ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : l.picked_quantity > 0 ? (
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  ) : scannedLineIds.has(l.id) ? (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  ) : (
                    <Package className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <span className="font-mono text-sm font-semibold">{l.inventory_batches?.batch_number}</span>
                    <span className="text-xs text-muted-foreground ml-2">Exp: {l.inventory_batches?.expiry_date}</span>
                    <Badge variant="outline" className="ml-2 text-xs">{l.location_type}</Badge>
                  </div>
                </div>
                <div className="text-sm font-mono tabular-nums">
                  {l.picked_quantity}/{l.allocated_quantity}
                </div>
                {!scannedLineIds.has(l.id) && l.picked_quantity < l.allocated_quantity && (
                  <Button variant="ghost" size="sm" className="text-xs h-7 text-warning" onClick={() => setExceptionLine(l)}>
                    <AlertTriangle className="h-3 w-3 mr-1" /> Exception
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCompletePick} disabled={!canComplete} className="flex-1">
              {canComplete
                ? totalPicked < totalAllocated
                  ? `Complete Partial Pick (${totalPicked}/${totalAllocated})`
                  : "Complete Pick"
                : "Scan at least one batch to complete"}
            </Button>
            <Button variant="outline" onClick={() => { setPickingId(null); setPickLines([]); setScannedLineIds(new Set()); }}>Cancel</Button>
            <Button variant="outline" onClick={() => setShowExceptions(!showExceptions)}>
              <AlertTriangle className="h-4 w-4 mr-1" /> Exceptions {exceptions?.length ? `(${exceptions.length})` : ""}
            </Button>
          </div>
          {showExceptions && (exceptions ?? []).length > 0 && (
            <div className="space-y-2 mt-3">
              <h4 className="text-sm font-semibold text-muted-foreground">Pick Exceptions</h4>
              {(exceptions ?? []).map((ex: any) => (
                <div key={ex.id} className="flex items-center justify-between p-3 rounded-lg border border-warning/30 bg-warning/5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">{ex.exception_type}</Badge>
                    <span className="font-mono text-xs">{ex.inventory_batches?.batch_number || "—"}</span>
                    <span className="text-xs text-muted-foreground">{ex.reason}</span>
                  </div>
                  <Badge variant="outline" className={ex.status === "OPEN" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}>{ex.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Exception dialog */}
      <Dialog open={!!exceptionLine} onOpenChange={(open) => !open && setExceptionLine(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise Pick Exception</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Batch: <span className="font-mono font-semibold">{exceptionLine?.inventory_batches?.batch_number}</span>
            </p>
            <div className="space-y-2">
              <Label>Exception Type</Label>
              <Select value={exceptionType} onValueChange={setExceptionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUARANTINE">Quarantine — QC blocked</SelectItem>
                  <SelectItem value="REVIEW">Review — needs inspection</SelectItem>
                  <SelectItem value="VOID">Void — damaged / unusable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={exceptionReason} onChange={(e) => setExceptionReason(e.target.value)} placeholder="Describe the issue…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExceptionLine(null)}>Cancel</Button>
            <Button onClick={handleRaiseException} disabled={!exceptionReason}>Raise Exception</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New pick form */}
      {showNew && !pickingId && (
        <div className="page-section p-5 mb-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Create Pick Request</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Label>Store</Label>
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                <SelectContent>
                  {(stores ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.store_code} — {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <div className="flex gap-2">
                <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="100" />
                <Button onClick={handleSuggest}>Allocate</Button>
              </div>
            </div>
          </div>

          {suggestions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">FEFO Allocation (PICKFACE first, then RESERVE by expiry)</h4>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={s.locationType === "PICKFACE" ? "bg-success/10 text-success border-success/30" : "bg-primary/10 text-primary border-primary/30"}>
                        {s.locationType}
                      </Badge>
                      <span className="font-mono text-xs font-semibold">{s.batchNumber}</span>
                      <span className="text-xs text-muted-foreground">Exp: {s.expiryDate}</span>
                      <span className="text-xs text-muted-foreground">@ {s.location}</span>
                    </div>
                    <div className="text-sm font-semibold tabular-nums">{s.quantity} units</div>
                  </div>
                ))}
              </div>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create Pick Request"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Pick history table */}
      <div className="page-section">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 font-medium text-muted-foreground">Pick Code</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Product</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Store</th>
                <th className="px-5 py-3 font-medium text-muted-foreground text-right">Requested</th>
                <th className="px-5 py-3 font-medium text-muted-foreground text-right">Fulfilled</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {(picks ?? []).map((p: any) => (
                <tr key={p.id} className="table-row-hover border-b border-border/50">
                  <td className="px-5 py-3 font-mono text-xs font-semibold">{p.pick_code}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium">{p.products?.name}</div>
                    <div className="text-xs text-muted-foreground">{p.products?.sku}</div>
                  </td>
                  <td className="px-5 py-3">{p.stores?.store_code}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{p.requested_quantity}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{p.fulfilled_quantity}</td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className={statusMap[p.status]?.cls || ""}>{statusMap[p.status]?.label || p.status}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    {p.status === "PENDING" && (
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleStartPicking(p.id)}>
                        Start Picking
                      </Button>
                    )}
                    {p.status === "PARTIAL" && (
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleStartPicking(p.id)}>
                        <RotateCcw className="h-3 w-3 mr-1" /> Resume
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {(picks ?? []).length === 0 && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">No pick requests yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default PickRequests;