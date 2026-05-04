import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

interface Threshold {
  id?: string;
  zone_name: string;
  min_days: number;
  max_days: number | null;
  action_description: string;
}

const defaultThresholds: Threshold[] = [
  { zone_name: "GREEN_ZONE", min_days: 31, max_days: 999, action_description: "Standard monitoring" },
  { zone_name: "YELLOW_ZONE", min_days: 15, max_days: 30, action_description: "Daily report to Store Manager; promotional pricing eligible" },
  { zone_name: "ORANGE_ZONE", min_days: 5, max_days: 14, action_description: "Auto markdown proposal → AI Pricing Engine" },
  { zone_name: "RED_ZONE", min_days: 1, max_days: 4, action_description: "Urgent clearance; 50%+ discount recommended" },
  { zone_name: "BLACK_ZONE", min_days: -999, max_days: 0, action_description: "POS block; auto write-off proposal" },
];

const zoneColor: Record<string, string> = {
  GREEN_ZONE: "zone-green", YELLOW_ZONE: "zone-yellow", ORANGE_ZONE: "zone-orange", RED_ZONE: "zone-red", BLACK_ZONE: "zone-black",
};

const AlertSettings = () => {
  const queryClient = useQueryClient();
  const [thresholds, setThresholds] = useState<Threshold[]>(defaultThresholds);
  const [recalculating, setRecalculating] = useState(false);

  const { data: dbThresholds } = useQuery({
    queryKey: ["alert-thresholds"],
    queryFn: async () => {
      const { data } = await supabase.from("alert_thresholds").select("*").order("min_days", { ascending: false });
      return data ?? [];
    },
  });

  useEffect(() => {
    if (dbThresholds && dbThresholds.length > 0) {
      setThresholds(dbThresholds.map((t) => ({
        id: t.id,
        zone_name: t.zone_name,
        min_days: t.min_days,
        max_days: t.max_days,
        action_description: t.action_description || "",
      })));
    }
  }, [dbThresholds]);

  const updateField = (idx: number, field: "min_days" | "max_days", value: string) => {
    setThresholds((prev) => prev.map((t, i) => i === idx ? { ...t, [field]: value === "" ? null : Number(value) } : t));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Delete existing and re-insert
      await supabase.from("alert_thresholds").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      for (const t of thresholds) {
        await supabase.from("alert_thresholds").insert({
          zone_name: t.zone_name,
          min_days: t.min_days,
          max_days: t.max_days,
          action_description: t.action_description,
        });
      }
    },
    onSuccess: () => {
      toast.success("Thresholds saved successfully.");
      queryClient.invalidateQueries({ queryKey: ["alert-thresholds"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      // Get all available batches in warning zones
      const { data: batches } = await supabase
        .from("inventory_batches")
        .select("id, batch_number, expiry_date, quantity, product_id, store_id, products(sku, current_price, unit_cost), stores(store_code)")
        .eq("status", "AVAILABLE")
        .eq("qc_status", "PASSED");

      const today = new Date();
      const orangeMin = thresholds.find((t) => t.zone_name === "ORANGE_ZONE")?.min_days ?? 5;
      const orangeMax = thresholds.find((t) => t.zone_name === "ORANGE_ZONE")?.max_days ?? 14;
      const redMax = thresholds.find((t) => t.zone_name === "RED_ZONE")?.max_days ?? 4;

      const warningBatches = (batches ?? []).filter((b) => {
        const days = Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000);
        return days <= (orangeMax ?? 14) && days > 0;
      });

      if (warningBatches.length === 0) {
        toast.info("No batches in warning zones. No proposals generated.");
        return;
      }

      // Generate AI proposals for warning-zone batches
      const items = warningBatches.map((b) => {
        const days = Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000);
        let zone = "ORANGE";
        if (days <= (redMax ?? 4)) zone = "RED";
        if (days <= 2) zone = "BLACK";
        return {
          sku: (b as any).products?.sku,
          batchNumber: b.batch_number,
          storeId: (b as any).stores?.store_code,
          quantityAvailable: b.quantity,
          expiryDate: b.expiry_date,
          daysUntilExpiry: days,
          currentPrice: Number((b as any).products?.current_price ?? 0),
          unitCost: Number((b as any).products?.unit_cost ?? 0),
          zone,
        };
      });

      const { data: aiResult, error } = await supabase.functions.invoke("ai-pricing-proposal", { body: { items } });
      if (error) throw error;

      const proposals = aiResult?.proposals ?? [];
      let created = 0;
      for (const p of proposals) {
        const batch = warningBatches.find((b) => (b as any).products?.sku === p.sku);
        if (batch) {
          await supabase.from("markdown_proposals").insert({
            batch_id: batch.id,
            sku: p.sku,
            batch_number: p.batchNumber,
            current_price: p.currentPrice,
            proposed_price: p.proposedPrice,
            discount_percent: p.discountPercent,
            reasoning: p.reasoning,
            urgency: p.urgency,
          });
          created++;
        }
      }
      toast.success(`Recalculated zones and generated ${created} new markdown proposals.`);
      queryClient.invalidateQueries({ queryKey: ["markdown-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["expiry-batches"] });
    } catch (e: any) {
      toast.error(e.message || "Recalculation failed");
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Alert Settings"
        description="Configure expiry monitoring thresholds. Changes recalculate zones and regenerate AI markdown proposals."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={recalculating}>
              <RefreshCw className={`h-4 w-4 mr-1 ${recalculating ? "animate-spin" : ""}`} />
              {recalculating ? "Recalculating…" : "Recalculate Zones"}
            </Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        }
      />

      <div className="page-section">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold">Default Expiry Zones</h2>
          <p className="text-sm text-muted-foreground">Global threshold configuration applied to all categories unless overridden at SKU level.</p>
        </div>
        <div className="divide-y divide-border">
          {thresholds.map((t, i) => (
            <div key={t.zone_name} className="px-5 py-4 flex items-center gap-6">
              <Badge variant="outline" className={`${zoneColor[t.zone_name] || ""} min-w-[120px] justify-center`}>{t.zone_name.replace("_", " ")}</Badge>
              <div className="flex items-center gap-2 min-w-[200px]">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Days range:</Label>
                <Input
                  type="number"
                  value={t.min_days}
                  onChange={(e) => updateField(i, "min_days", e.target.value)}
                  className="w-20 h-8 text-center font-mono text-sm"
                />
                <span className="text-muted-foreground">—</span>
                <Input
                  type="number"
                  value={t.max_days === 999 ? "" : (t.max_days ?? "")}
                  onChange={(e) => updateField(i, "max_days", e.target.value)}
                  className="w-20 h-8 text-center font-mono text-sm"
                  placeholder="∞"
                />
              </div>
              <div className="flex-1 text-sm text-muted-foreground">{t.action_description}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default AlertSettings;