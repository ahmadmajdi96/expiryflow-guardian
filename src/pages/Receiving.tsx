import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScanBarcode, Check, Package } from "lucide-react";

const mockPOLines = [
  { sku: "MILK-001", name: "Fresh Whole Milk 1L", ordered: 500, received: 0, expiryTrackable: true, shelfLifeDays: 14 },
  { sku: "JUICE-02", name: "Orange Juice 500ml", ordered: 200, received: 0, expiryTrackable: true, shelfLifeDays: 30 },
  { sku: "BREAD-03", name: "White Sandwich Bread", ordered: 300, received: 0, expiryTrackable: true, shelfLifeDays: 7 },
];

const Receiving = () => {
  const [step, setStep] = useState(1);
  const [poNumber, setPoNumber] = useState("");
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [mfgDate, setMfgDate] = useState("");
  const [receivedQty, setReceivedQty] = useState("");

  return (
    <>
      <PageHeader
        title="Receiving & Putaway"
        description="PO-based receiving workflow with batch/expiry capture and FEFO putaway logic."
        badge={<Badge variant="outline" className="text-xs">Step {step} of 4</Badge>}
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
              onClick={() => setStep(s.n)}
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
                  <Button onClick={() => { setPoNumber("PO-2026-05001"); setStep(2); }}>Load PO</Button>
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
                {mockPOLines.map((line, i) => (
                  <div
                    key={line.sku}
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedLine === i ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    }`}
                    onClick={() => { setSelectedLine(i); setStep(3); }}
                  >
                    <div>
                      <div className="font-medium">{line.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{line.sku} · Shelf life: {line.shelfLifeDays}d</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold tabular-nums">{line.received}/{line.ordered}</div>
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
                {selectedLine !== null ? mockPOLines[selectedLine].name : "Select an item"} — mandatory fields for expiry-trackable items.
              </p>
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
                  <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                </div>
              </div>
              <Button onClick={() => setStep(4)} className="mt-2">Confirm & Suggest Putaway</Button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Putaway Location</h3>
              <div className="bg-success/10 border border-success/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-success font-semibold">
                  <Check className="h-5 w-5" /> FEFO Putaway Suggestion
                </div>
                <p className="text-sm">
                  Batch <span className="font-mono font-semibold">{batchNumber || "B20260504-001"}</span> has the earliest expiry in this zone.
                  Suggested location: <span className="font-mono font-bold">PICKFACE-A12</span>
                </p>
                <p className="text-xs text-muted-foreground">Scan the location barcode to confirm putaway.</p>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Scan location barcode…" className="font-mono" />
                <Button>Confirm Putaway</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Receiving;