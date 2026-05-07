import { useState } from "react";
import { useQuery, useMutation, useQueryClient, useIsFetching } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScanBarcode, Check, Package } from "lucide-react";
import { Camera } from "lucide-react";
import { getFEFOPutawaySuggestion } from "@/lib/fefo";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle as AlertTriangleIcon } from "lucide-react";
import { WifiOff, Wifi, CloudUpload } from "lucide-react";
import { queueOfflineReceiving, syncPendingItems, getQueueCount, isOnline } from "@/lib/offlineReceiving";
import { sendWebhookWithRetry } from "@/lib/webhookRetry";

const Receiving = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [poNumber, setPoNumber] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [mfgDate, setMfgDate] = useState("");
  const [receivedQty, setReceivedQty] = useState("");
  const [putawaySuggestion, setPutawaySuggestion] = useState<{ locationType: string; locationCode: string; reason: string } | null>(null);
  const [locationScan, setLocationScan] = useState("");
  const [labelPhoto, setLabelPhoto] = useState<File | null>(null);
  const [labelPreview, setLabelPreview] = useState<string | null>(null);
  const [shelfLifeWarning, setShelfLifeWarning] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [offlineCount, setOfflineCount] = useState(0);

  // Track online/offline status
  useState(() => {
    const handleOnline = async () => {
      setOnline(true);
      const result = await syncPendingItems();
      if (result.synced > 0) {
        toast.success(`Synced ${result.synced} offline receiving records`);
        queryClient.invalidateQueries({ queryKey: ["receiving-po"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-batches"] });
      }
      if (result.conflicts.length > 0) {
        for (const c of result.conflicts) {
          toast.warning(c.reason, { duration: 8000 });
        }
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} items failed to sync — will retry later.`);
      }
      setOfflineCount(await getQueueCount());
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    getQueueCount().then(setOfflineCount);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLabelPhoto(file);
      setLabelPreview(URL.createObjectURL(file));
    }
  };

  // Validate shelf life when expiry date changes
  const validateShelfLife = (expiry: string) => {
    setExpiryDate(expiry);
    if (!expiry || !selectedLine) {
      setShelfLifeWarning(null);
      return;
    }
    const product = selectedLine.products;
    const shelfLifeDays = product?.shelf_life_days;
    const today = new Date();
    const expiryDateObj = new Date(expiry);
    const daysLeft = Math.ceil((expiryDateObj.getTime() - today.getTime()) / 86400000);

    if (daysLeft <= 0) {
      setShelfLifeWarning("⛔ This batch is already expired! Cannot receive expired stock.");
      return;
    }
    if (shelfLifeDays && daysLeft < shelfLifeDays * 0.5) {
      const pctUsed = Math.round(((shelfLifeDays - daysLeft) / shelfLifeDays) * 100);
      setShelfLifeWarning(`⚠️ Shelf life ${pctUsed}% consumed (${daysLeft} of ${shelfLifeDays} days remaining). Consider rejecting this batch.`);
      return;
    }
    setShelfLifeWarning(null);
  };

  // Parse QR/barcode and auto-populate batch fields
  const handleBarcodeAutoFill = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    // QR format: BATCH:xxx|EXP:xxx|LOC:xxx|QTY:xxx
    const qrMatch = trimmed.match(/^BATCH:([^|]+)\|EXP:([^|]+)\|LOC:([^|]+)\|QTY:(\d+)$/);
    if (qrMatch) {
      setBatchNumber(qrMatch[1]);
      // Parse expiry — could be YYYY-MM-DD already
      setExpiryDate(qrMatch[2]);
      setLocationScan(qrMatch[3].replace(/^[^/]+\//, "")); // strip location_type prefix
      setReceivedQty(qrMatch[4]);
      toast.success(`QR parsed: Batch ${qrMatch[1]}, Exp ${qrMatch[2]}, Qty ${qrMatch[4]}`);
      setBarcodeInput("");
      return;
    }
    // GS1-128: (01)GTIN(10)BATCH(17)YYMMDD
    const gs1Match = trimmed.match(/\(01\)(\d{14})\(10\)([^\(]+)(?:\(17\)(\d{6}))?/);
    if (gs1Match) {
      setBatchNumber(gs1Match[2]);
      if (gs1Match[3]) {
        const y = gs1Match[3].slice(0, 2);
        const m = gs1Match[3].slice(2, 4);
        const d = gs1Match[3].slice(4, 6);
        setExpiryDate(`20${y}-${m}-${d}`);
      }
      toast.success(`GS1 parsed: Batch ${gs1Match[2]}`);
      setBarcodeInput("");
      return;
    }
    // Batch prefix
    if (/^(BATCH|LOT|BN)[\-:]?\s*/i.test(trimmed)) {
      setBatchNumber(trimmed.replace(/^(BATCH|LOT|BN)[\-:]?\s*/i, ""));
      toast.info("Batch number auto-filled from label scan.");
      setBarcodeInput("");
      return;
    }
    // Fallback: treat as batch number
    setBatchNumber(trimmed);
    setBarcodeInput("");
  };

  // Load PO + lines
  const { data: poData } = useQuery({
    queryKey: ["receiving-po", poNumber],
    queryFn: async () => {
      if (!poNumber) return null;
      const { data: po } = await supabase
        .from("purchase_orders")
        .select("*, po_lines!po_lines_po_id_fkey(*, products!po_lines_product_id_fkey(sku, name, shelf_life_days, expiry_trackable))")
        .eq("po_number", poNumber)
        .single();
      return po;
    },
    enabled: !!poNumber && step >= 2,
  });

  const poLines = (poData as any)?.po_lines ?? [];
  const selectedLine = poLines.find((l: any) => l.id === selectedLineId);

  const handleLoadPO = async () => {
    if (!poNumber.trim()) {
      toast.error("Please enter a PO number before loading.");
      return;
    }
    setStep(2);
  };

  const handleSelectLine = (lineId: string) => {
    if (!poData) {
      toast.error("No PO loaded. Go back to step 1 and enter a valid PO number.");
      setStep(1);
      return;
    }
    setSelectedLineId(lineId);
    setStep(3);
  };

  const handleConfirmBatch = async () => {
    if (!selectedLine || !expiryDate || !poData) {
      toast.error("Please select a line item and enter an expiry date.");
      return;
    }
    // Block expired stock
    const daysLeft = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
    if (daysLeft <= 0) {
      toast.error("Cannot receive expired stock. Reject this batch.");
      return;
    }
    const suggestion = await getFEFOPutawaySuggestion(
      selectedLine.product_id,
      "a1000000-0000-0000-0000-000000000001",
      expiryDate
    );
    setPutawaySuggestion(suggestion);
    setStep(4);
  };

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLine || !putawaySuggestion) throw new Error("Missing data");
      const storeId = "a1000000-0000-0000-0000-000000000001";
      const batchNum = batchNumber || `B${new Date().toISOString().slice(0,10).replace(/-/g,"")}`;
      const qty = Number(receivedQty) || selectedLine.quantity_ordered;
      const loc = locationScan || putawaySuggestion.locationCode;

      // Offline mode: queue to IndexedDB
      if (!isOnline()) {
        await queueOfflineReceiving({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          payload: {
            batch_number: batchNum,
            product_id: selectedLine.product_id,
            store_id: storeId,
            quantity: qty,
            expiry_date: expiryDate,
            manufacturing_date: mfgDate || null,
            location: loc,
            po_line_id: selectedLine.id,
            received_by: user?.id ?? null,
          },
        });
        setOfflineCount(await getQueueCount());
        return;
      }

      // Upload label photo if provided
      let labelImageUrl: string | null = null;
      if (labelPhoto) {
        const ext = labelPhoto.name.split(".").pop() || "jpg";
        const path = `${storeId}/${batchNumber || Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("batch-labels").upload(path, labelPhoto);
        if (uploadErr) console.error("Photo upload failed:", uploadErr.message);
        else {
          const { data: urlData } = supabase.storage.from("batch-labels").getPublicUrl(path);
          labelImageUrl = urlData.publicUrl;
        }
      }

      // Create inventory batch
      await supabase.from("inventory_batches").insert({
        batch_number: batchNum,
        product_id: selectedLine.product_id,
        store_id: storeId,
        quantity: qty,
        expiry_date: expiryDate,
        manufacturing_date: mfgDate || null,
        location: loc,
        status: "AVAILABLE",
        qc_status: "PENDING",
        po_line_id: selectedLine.id,
        received_by: user?.id,
        ...(labelImageUrl ? { label_image_url: labelImageUrl } : {}),
      } as any);

      // Update PO line received qty
      await supabase.from("po_lines").update({
        quantity_received: selectedLine.quantity_received + qty,
      }).eq("id", selectedLine.id);

      // Log FEFO allocation
      await supabase.from("fefo_allocation_log").insert({
        batch_id: crypto.randomUUID(), // placeholder
        allocation_type: "PUTAWAY",
        location_type: putawaySuggestion.locationType,
        location_code: locationScan || putawaySuggestion.locationCode,
        quantity: Number(receivedQty) || selectedLine.quantity_ordered,
        allocated_by: user?.id,
      });

      // Send receipt confirmation to CoreERP with idempotent retry
      const idempotencyKey = `receipt-${poData?.po_number}-${selectedLine.id}-${batchNum}`;
      try {
        const webhookResult = await sendWebhookWithRetry({
          event: "receipt.confirmed",
          idempotencyKey,
          data: {
            poNumber: poData?.po_number,
            sku: selectedLine.products?.sku,
            batchNumber: batchNum,
            quantityReceived: qty,
            receivedBy: user?.id,
            location: loc,
          },
        });
        if (!webhookResult.success) {
          toast.warning(`CoreERP notification failed after ${webhookResult.attempts} attempts. Receipt saved locally.`, { duration: 6000 });
        }
      } catch (e) {
        console.warn("CoreERP receipt confirmation failed (non-blocking):", e);
      }
    },
    onSuccess: () => {
      toast.success(isOnline() ? "Batch received and put away successfully" : "Batch queued offline — will sync when connection returns");
      queryClient.invalidateQueries({ queryKey: ["receiving-po"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-batches"] });
      // Route to QC Inspection filtered by the batch just received
      navigate(`/qc-inspection`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Receiving & Putaway"
        description="PO-based receiving workflow with batch/expiry capture and FEFO putaway logic."
        badge={<Badge variant="outline" className="text-xs">Step {step} of 4</Badge>}
        actions={
        <div className="flex gap-2 items-center">
          {!online && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
              <WifiOff className="h-3 w-3 mr-1" /> Offline
            </Badge>
          )}
          {offlineCount > 0 && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
              <CloudUpload className="h-3 w-3 mr-1" /> {offlineCount} queued
            </Badge>
          )}
            <Button variant="outline" size="sm" onClick={() => navigate("/qc-inspection")}>QC Inspection</Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/pick-requests")}>Pick Requests</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Steps sidebar */}
        <div className="page-section p-5 space-y-3">
          {[
            { n: 1, label: "PO Selection", desc: "Scan or select purchase order" },
            { n: 2, label: "Line Item Scan", desc: "Scan product barcodes" },
            { n: 3, label: "Batch & Expiry", desc: "Capture batch details" },
            { n: 4, label: "Putaway Confirm", desc: "FEFO location assignment" },
          ].map((s) => (
            <div
              key={s.n}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                step === s.n ? "bg-primary/5 border border-primary/20" : "border border-transparent hover:bg-muted/50"
              }`}
              onClick={() => {
                if (s.n >= 2 && !poData && !poNumber.trim()) {
                  toast.error("Load a PO first.");
                  return;
                }
                setStep(s.n);
              }}
            >
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step > s.n ? "bg-success text-success-foreground" : step === s.n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {step > s.n ? <Check className="h-3.5 w-3.5" /> : s.n}
              </div>
              <div>
                <div className="text-sm font-medium">{s.label}</div>
                <div className="text-xs text-muted-foreground">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="lg:col-span-2 page-section p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2"><ScanBarcode className="h-5 w-5 text-primary" /> PO Selection</h3>
              <div className="space-y-2">
                <Label>Scan Delivery Note or Enter PO Number</Label>
                <div className="flex gap-2">
                  <Input placeholder="PO-2026-05001" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} className="font-mono" />
                  <Button onClick={handleLoadPO}>Load PO</Button>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p>Scan the barcode on the supplier delivery note to automatically load the purchase order, or enter the PO number manually.</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> PO Lines — {poNumber || "PO-2026-05001"}</h3>
              <div className="space-y-2">
                {poLines.length === 0 && (
                  <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                    <p>No PO found for "<span className="font-mono font-semibold">{poNumber}</span>". Check the PO number and try again.</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => setStep(1)}>← Back to PO Selection</Button>
                  </div>
                )}
                {poLines.map((line: any) => (
                  <div
                    key={line.id}
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedLineId === line.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    }`}
                    onClick={() => handleSelectLine(line.id)}
                  >
                    <div>
                      <div className="font-medium">{line.products?.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{line.products?.sku} · Shelf life: {line.products?.shelf_life_days ?? "N/A"}d</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold tabular-nums">{line.quantity_received}/{line.quantity_ordered}</div>
                      <div className="text-xs text-muted-foreground">received/ordered</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Batch & Expiry Capture</h3>
              <p className="text-sm text-muted-foreground">
                {selectedLine ? selectedLine.products?.name : "Select an item"} — mandatory fields for expiry-trackable items.
              </p>
              {/* Barcode/QR scanner input */}
              <div className="flex gap-2 items-center p-3 rounded-lg border border-primary/30 bg-primary/5">
                <ScanBarcode className="h-5 w-5 text-primary" />
                <Input
                  placeholder="Scan QR/barcode to auto-fill batch details…"
                  className="font-mono flex-1"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleBarcodeAutoFill(barcodeInput); }}
                />
                <Button variant="outline" size="sm" onClick={() => handleBarcodeAutoFill(barcodeInput)}>Parse</Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Batch Number</Label>
                  <Input placeholder="B20260504-001" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Received Quantity</Label>
                  <Input type="number" placeholder="500" value={receivedQty} onChange={(e) => setReceivedQty(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Manufacturing Date</Label>
                  <Input type="date" value={mfgDate} onChange={(e) => setMfgDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input type="date" value={expiryDate} onChange={(e) => validateShelfLife(e.target.value)} />
                </div>
                {shelfLifeWarning && (
                  <div className="col-span-2">
                    <Alert variant={shelfLifeWarning.startsWith("⛔") ? "destructive" : "default"} className="py-2">
                      <AlertTriangleIcon className="h-4 w-4" />
                      <AlertDescription className="text-sm">{shelfLifeWarning}</AlertDescription>
                    </Alert>
                  </div>
                )}
                <div className="col-span-2 space-y-2">
                  <Label className="flex items-center gap-1"><Camera className="h-4 w-4" /> Batch Label Photo</Label>
                  <Input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} />
                  {labelPreview && (
                    <div className="mt-2">
                      <img src={labelPreview} alt="Label preview" className="h-32 rounded-lg border border-border object-cover" />
                    </div>
                  )}
                </div>
              </div>
              <Button onClick={handleConfirmBatch} className="mt-2" disabled={!expiryDate || shelfLifeWarning?.startsWith("⛔")}>Confirm & Suggest Putaway</Button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Putaway Location</h3>
              <div className={`${putawaySuggestion?.locationType === "PICKFACE" ? "bg-success/10 border-success/30" : "bg-primary/10 border-primary/30"} border rounded-lg p-4 space-y-2`}>
                <div className="flex items-center gap-2 text-success font-semibold">
                  <Check className="h-5 w-5" /> FEFO Putaway Suggestion
                </div>
                <p className="text-sm">
                  Batch <span className="font-mono font-semibold">{batchNumber || "NEW"}</span> →{" "}
                  <span className="font-mono font-bold">{putawaySuggestion?.locationCode}</span>{" "}
                  <Badge variant="outline" className="text-xs ml-1">{putawaySuggestion?.locationType}</Badge>
                </p>
                <p className="text-xs text-muted-foreground">{putawaySuggestion?.reason}</p>
                <p className="text-xs text-muted-foreground mt-1">Scan the location barcode to confirm putaway.</p>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Scan location barcode…" className="font-mono" value={locationScan} onChange={(e) => setLocationScan(e.target.value)} />
                <Button onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending}>
                  {confirmMutation.isPending ? "Saving…" : "Confirm Putaway"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Receiving;