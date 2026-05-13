import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { horizonDays = 14 } = await req.json().catch(() => ({}));
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const today = new Date();
    const { data: batches } = await supabase
      .from("inventory_batches")
      .select("quantity, expiry_date, location, products!inventory_batches_product_id_fkey(sku, name, category, shelf_life_days, current_price), stores!inventory_batches_store_id_fkey(store_code)")
      .eq("status", "AVAILABLE")
      .order("expiry_date")
      .limit(300);

    // Aggregate per SKU+store
    const map = new Map<string, any>();
    for (const b of batches ?? []) {
      const sku = (b as any).products?.sku;
      const store = (b as any).stores?.store_code;
      if (!sku || !store) continue;
      const key = `${sku}@${store}`;
      const days = Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000);
      const cur = map.get(key) || { sku, store, name: (b as any).products?.name, category: (b as any).products?.category, price: (b as any).products?.current_price, totalQty: 0, soonestExpiry: b.expiry_date, soonestDays: days };
      cur.totalQty += b.quantity || 0;
      if (days < cur.soonestDays) { cur.soonestDays = days; cur.soonestExpiry = b.expiry_date; }
      map.set(key, cur);
    }
    const items = Array.from(map.values()).slice(0, 60);

    const systemPrompt = `You are a demand-and-waste forecasting model for a grocery/FMCG WMS.
Given current on-hand stock per SKU+store with soonest expiry, estimate ${horizonDays}-day sell-through and write-off risk.
Use category norms (dairy/produce sell faster than ambient), expiry pressure (sooner = more aggressive), and stock depth.
Return strictly via the tool.`;

    const userPrompt = `Forecast horizon: ${horizonDays} days. Today: ${today.toISOString().slice(0,10)}.
Items:
${JSON.stringify(items, null, 2)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        tools: [{ type: "function", function: { name: "return_forecast", description: "Return per-SKU forecast", parameters: {
          type: "object",
          properties: { forecasts: { type: "array", items: { type: "object", properties: {
            sku: { type: "string" }, store: { type: "string" }, predictedSellThrough: { type: "number", description: "Units expected to sell in horizon" }, writeOffRisk: { type: "string", enum: ["LOW","MEDIUM","HIGH","CRITICAL"] }, predictedWriteOffUnits: { type: "number" }, recommendation: { type: "string" }, confidence: { type: "string", enum: ["LOW","MEDIUM","HIGH"] }
          }, required: ["sku","store","predictedSellThrough","writeOffRisk","predictedWriteOffUnits","recommendation","confidence"], additionalProperties: false } } },
          required: ["forecasts"], additionalProperties: false,
        }}}],
        tool_choice: { type: "function", function: { name: "return_forecast" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { forecasts: [] };
    // Merge with snapshot for UI
    const merged = parsed.forecasts.map((f: any) => {
      const ctx = items.find((i: any) => i.sku === f.sku && i.store === f.store);
      return { ...f, name: ctx?.name, category: ctx?.category, totalQty: ctx?.totalQty, soonestExpiry: ctx?.soonestExpiry, soonestDays: ctx?.soonestDays, price: ctx?.price };
    });
    return new Response(JSON.stringify({ horizonDays, generatedAt: today.toISOString(), forecasts: merged }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("wms-forecast error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});