import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, Package, Calendar, MapPin } from "lucide-react";

function getZone(daysLeft: number) {
  if (daysLeft <= 2) return "BLACK";
  if (daysLeft <= 7) return "RED";
  if (daysLeft <= 14) return "ORANGE";
  if (daysLeft <= 30) return "YELLOW";
  return "GREEN";
}

const zoneClass: Record<string, string> = {
  GREEN: "zone-green", YELLOW: "zone-yellow", ORANGE: "zone-orange", RED: "zone-red", BLACK: "zone-black"
};

const BatchDetails = () => {
  const { id } = useParams<{ id: string }>();

  const { data: batch, isLoading } = useQuery({
    queryKey: ["batch-detail", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("inventory_batches")
        .select("*, products(sku, name, current_price, unit_cost, shelf_life_days), stores(store_code, name)")
        .eq("id", id!)
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: qcRecords } = useQuery({
    queryKey: ["batch-qc", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("qc_inspections")
        .select("*")
        .eq("batch_id", id!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  if (!batch) return <div className="p-8 text-center text-muted-foreground">Batch not found.</div>;

  const daysLeft = Math.ceil((new Date(batch.expiry_date).getTime() - Date.now()) / 86400000);
  const zone = getZone(daysLeft);
  const labelUrl = (batch as any).label_image_url;

  return (
    <>
      <PageHeader
        title={`Batch ${batch.batch_number}`}
        description={`${(batch as any).products?.name} — ${(batch as any).stores?.store_code}`}
        actions={<Link to="/"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button></Link>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="page-section p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Batch Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">SKU:</span> <span className="font-mono">{(batch as any).products?.sku}</span></div>
              <div><span className="text-muted-foreground">Product:</span> <span className="font-semibold">{(batch as any).products?.name}</span></div>
              <div><span className="text-muted-foreground">Quantity:</span> <span className="font-semibold tabular-nums">{batch.quantity}</span></div>
              <div className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-muted-foreground" /> <span className="text-muted-foreground">Expiry:</span> <span className="font-mono">{batch.expiry_date}</span></div>
              <div><span className="text-muted-foreground">Days Left:</span> <span className="font-semibold">{daysLeft}</span></div>
              <div><span className="text-muted-foreground">Zone:</span> <span className={`pill ${zoneClass[zone]}`}>{zone}</span></div>
              <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> <span className="text-muted-foreground">Location:</span> <span className="font-mono">{batch.location}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline">{batch.status}</Badge></div>
              <div><span className="text-muted-foreground">QC Status:</span> <Badge variant="outline">{batch.qc_status}</Badge></div>
              {batch.manufacturing_date && <div><span className="text-muted-foreground">Mfg Date:</span> <span className="font-mono">{batch.manufacturing_date}</span></div>}
            </div>
          </div>

          {qcRecords && qcRecords.length > 0 && (
            <div className="page-section p-5">
              <h3 className="font-semibold mb-4">QC Inspection History</h3>
              <div className="space-y-2">
                {qcRecords.map((qc) => (
                  <div key={qc.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <Badge variant="outline" className={qc.result === "PASSED" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}>{qc.result}</Badge>
                      <span className="text-xs text-muted-foreground ml-2">{qc.inspected_at?.slice(0, 10)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{qc.notes || "No notes"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="page-section p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /> Label Photo</h3>
          {labelUrl ? (
            <div>
              <img src={labelUrl} alt={`Label for batch ${batch.batch_number}`} className="w-full rounded-lg border border-border shadow-sm" />
              <p className="text-xs text-muted-foreground mt-2">Captured during receiving for QC audit trail.</p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 rounded-lg border border-dashed border-border bg-muted/30">
              <p className="text-sm text-muted-foreground">No label photo captured</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default BatchDetails;