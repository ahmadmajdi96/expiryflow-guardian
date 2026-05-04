import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Tag } from "lucide-react";

const mockAlerts = [
  { sku: "MILK-001", name: "Fresh Whole Milk 1L", batch: "B20260420", store: "ST-01", qty: 450, expiry: "2026-05-15", days: 11, zone: "ORANGE", price: 3.99, cost: 1.50 },
  { sku: "JUICE-02", name: "Orange Juice 500ml", batch: "B20260415", store: "ST-03", qty: 120, expiry: "2026-05-10", days: 6, zone: "RED", price: 2.49, cost: 0.80 },
  { sku: "BREAD-03", name: "White Sandwich Bread", batch: "B20260501", store: "ST-01", qty: 300, expiry: "2026-05-09", days: 5, zone: "RED", price: 1.99, cost: 0.60 },
  { sku: "YOGURT-05", name: "Greek Yogurt 200g", batch: "B20260418", store: "ST-02", qty: 200, expiry: "2026-05-20", days: 16, zone: "YELLOW", price: 1.49, cost: 0.55 },
  { sku: "CHEESE-01", name: "Cheddar Slices 200g", batch: "B20260410", store: "ST-01", qty: 85, expiry: "2026-05-08", days: 4, zone: "RED", price: 4.99, cost: 2.10 },
  { sku: "CREAM-02", name: "Heavy Cream 250ml", batch: "B20260422", store: "ST-02", qty: 60, expiry: "2026-05-18", days: 14, zone: "ORANGE", price: 2.29, cost: 0.90 },
  { sku: "BUTTER-01", name: "Salted Butter 250g", batch: "B20260412", store: "ST-03", qty: 150, expiry: "2026-05-06", days: 2, zone: "RED", price: 3.49, cost: 1.40 },
  { sku: "EGGS-001", name: "Free Range Eggs 12pk", batch: "B20260425", store: "ST-01", qty: 400, expiry: "2026-05-25", days: 21, zone: "YELLOW", price: 5.99, cost: 3.00 },
];

const zoneClass: Record<string, string> = { GREEN: "zone-green", YELLOW: "zone-yellow", ORANGE: "zone-orange", RED: "zone-red", BLACK: "zone-black" };
const zoneEmoji: Record<string, string> = { GREEN: "🟢", YELLOW: "🟡", ORANGE: "🟠", RED: "🔴", BLACK: "⚫" };

const ExpiryAlerts = () => {
  const [storeFilter, setStoreFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);

  const filtered = mockAlerts.filter((a) => {
    if (storeFilter !== "all" && a.store !== storeFilter) return false;
    if (zoneFilter !== "all" && a.zone !== zoneFilter) return false;
    return true;
  });

  const toggleSelect = (batch: string) => {
    setSelected((prev) => prev.includes(batch) ? prev.filter((b) => b !== batch) : [...prev, batch]);
  };

  return (
    <>
      <PageHeader
        title="Near-Expiry Alerts"
        description="Monitor and act on stock approaching expiry across all stores. Auto-refreshes every 5 minutes."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
            <Button size="sm" disabled={selected.length === 0}><Tag className="h-4 w-4 mr-1" /> Batch Propose Markdown ({selected.length})</Button>
          </div>
        }
      />

      <div className="flex gap-3 mb-4">
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Store" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stores</SelectItem>
            <SelectItem value="ST-01">ST-01</SelectItem>
            <SelectItem value="ST-02">ST-02</SelectItem>
            <SelectItem value="ST-03">ST-03</SelectItem>
          </SelectContent>
        </Select>
        <Select value={zoneFilter} onValueChange={setZoneFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Zone" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            <SelectItem value="YELLOW">🟡 Yellow</SelectItem>
            <SelectItem value="ORANGE">🟠 Orange</SelectItem>
            <SelectItem value="RED">🔴 Red</SelectItem>
            <SelectItem value="BLACK">⚫ Black</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="page-section">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 w-10"></th>
                <th className="px-5 py-3 font-medium text-muted-foreground">SKU</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Product</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Batch #</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Store</th>
                <th className="px-5 py-3 font-medium text-muted-foreground text-right">Qty</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Expiry</th>
                <th className="px-5 py-3 font-medium text-muted-foreground text-right">Days Left</th>
                <th className="px-5 py-3 font-medium text-muted-foreground text-right">Price</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Zone</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.batch} className="table-row-hover border-b border-border/50">
                  <td className="px-5 py-3">
                    <input type="checkbox" checked={selected.includes(a.batch)} onChange={() => toggleSelect(a.batch)} className="rounded border-border" />
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">{a.sku}</td>
                  <td className="px-5 py-3 font-medium">{a.name}</td>
                  <td className="px-5 py-3 font-mono text-xs">{a.batch}</td>
                  <td className="px-5 py-3">{a.store}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{a.qty}</td>
                  <td className="px-5 py-3 font-mono text-xs">{a.expiry}</td>
                  <td className="px-5 py-3 text-right tabular-nums font-semibold">{a.days}</td>
                  <td className="px-5 py-3 text-right tabular-nums">${a.price.toFixed(2)}</td>
                  <td className="px-5 py-3"><span className={`pill ${zoneClass[a.zone]}`}>{zoneEmoji[a.zone]} {a.zone}</span></td>
                  <td className="px-5 py-3">
                    <Button variant="outline" size="sm" className="text-xs h-7">
                      {a.zone === "RED" ? "Urgent Clear" : "Propose MD"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default ExpiryAlerts;