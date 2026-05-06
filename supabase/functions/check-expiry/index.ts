import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const url = new URL(req.url);
    const sku = url.searchParams.get("sku");
    const batch = url.searchParams.get("batch");
    const storeId = url.searchParams.get("storeId");

    if (!sku) {
      return new Response(JSON.stringify({ error: "Missing required parameter: sku" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the product
    const { data: product } = await supabase
      .from("products").select("id").eq("sku", sku).single();

    if (!product) {
      return new Response(JSON.stringify({
        status: "UNKNOWN", message: `SKU ${sku} not found in system.`,
      }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build query for matching batches
    let query = supabase
      .from("inventory_batches")
      .select("id, batch_number, expiry_date, quantity, status, qc_status, location, stores(store_code)")
      .eq("product_id", product.id)
      .in("status", ["AVAILABLE"])
      .eq("qc_status", "PASSED")
      .gt("quantity", 0);

    if (batch) query = query.eq("batch_number", batch);
    if (storeId) {
      // storeId can be a store_code or UUID
      const { data: store } = await supabase
        .from("stores").select("id").eq("store_code", storeId).single();
      if (store) query = query.eq("store_id", store.id);
      else query = query.eq("store_id", storeId);
    }

    const { data: batches } = await query.order("expiry_date", { ascending: true }).limit(1);
    const matchedBatch = batches?.[0];

    if (!matchedBatch) {
      return new Response(JSON.stringify({
        status: "UNKNOWN",
        message: `No available stock found for SKU ${sku}${batch ? ` batch ${batch}` : ""}${storeId ? ` at store ${storeId}` : ""}.`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const today = new Date();
    const expiryDate = new Date(matchedBatch.expiry_date);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / 86400000);

    let status: string;
    let zone: string;
    let message: string;

    if (daysUntilExpiry <= 0) {
      status = "BLOCKED";
      zone = "BLACK";
      message = "ALERT: Item past sell-by date. Remove from sale.";
    } else if (daysUntilExpiry <= 4) {
      status = "WARNING";
      zone = "RED";
      message = `Item expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}. Urgent clearance recommended.`;
    } else if (daysUntilExpiry <= 14) {
      status = "WARNING";
      zone = "ORANGE";
      message = `Item expires in ${daysUntilExpiry} days. Markdown pricing eligible.`;
    } else if (daysUntilExpiry <= 30) {
      status = "OK";
      zone = "YELLOW";
      message = `Item expires in ${daysUntilExpiry} days. OK to sell.`;
    } else {
      status = "OK";
      zone = "GREEN";
      message = `Item expires in ${daysUntilExpiry} days. OK to sell.`;
    }

    return new Response(JSON.stringify({
      status,
      message,
      expiryDate: matchedBatch.expiry_date,
      daysUntilExpiry,
      zone,
      batchNumber: matchedBatch.batch_number,
      quantityAvailable: matchedBatch.quantity,
      location: matchedBatch.location,
      storeCode: (matchedBatch as any).stores?.store_code ?? null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("check-expiry error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});