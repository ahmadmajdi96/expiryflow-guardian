import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Threshold { name: string; minDays: number; maxDays: number; action: string; color: string }

const defaultThresholds: Threshold[] = [
  { name: "GREEN_ZONE", minDays: 31, maxDays: 999, action: "Standard monitoring", color: "zone-green" },
  { name: "YELLOW_ZONE", minDays: 15, maxDays: 30, action: "Daily report to Store Manager; promotional pricing eligible", color: "zone-yellow" },
  { name: "ORANGE_ZONE", minDays: 5, maxDays: 14, action: "Auto markdown proposal → AI Pricing Engine", color: "zone-orange" },
  { name: "RED_ZONE", minDays: 1, maxDays: 4, action: "Urgent clearance; 50%+ discount recommended", color: "zone-red" },
  { name: "BLACK_ZONE", minDays: -999, maxDays: 0, action: "POS block; auto write-off proposal", color: "zone-black" },
];

const AlertSettings = () => {
  const [thresholds] = useState<Threshold[]>(defaultThresholds);

  return (
    <>
      <PageHeader
        title="Alert Settings"
        description="Configure expiry monitoring thresholds per product category or SKU. These zones drive automated alerts and markdown proposals."
        actions={<Button size="sm">Save Changes</Button>}
      />

      <div className="page-section">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold">Default Expiry Zones</h2>
          <p className="text-sm text-muted-foreground">Global threshold configuration applied to all categories unless overridden at SKU level.</p>
        </div>
        <div className="divide-y divide-border">
          {thresholds.map((t) => (
            <div key={t.name} className="px-5 py-4 flex items-center gap-6">
              <Badge variant="outline" className={`${t.color} min-w-[120px] justify-center`}>{t.name.replace("_", " ")}</Badge>
              <div className="flex items-center gap-2 min-w-[200px]">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Days range:</Label>
                <Input type="number" defaultValue={t.minDays} className="w-20 h-8 text-center font-mono text-sm" />
                <span className="text-muted-foreground">—</span>
                <Input type="number" defaultValue={t.maxDays === 999 ? "" : t.maxDays} className="w-20 h-8 text-center font-mono text-sm" placeholder="∞" />
              </div>
              <div className="flex-1 text-sm text-muted-foreground">{t.action}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default AlertSettings;