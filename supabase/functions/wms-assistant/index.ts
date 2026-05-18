import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Pull live snapshot
    const today = new Date();
    const [{ data: batches }, { data: alerts }, { data: quarantined }, { data: products }] = await Promise.all([
      supabase.from("inventory_batches").select("id, batch_number, quantity, expiry_date, location, status, qc_status, products!inventory_batches_product_id_fkey(sku, name), stores!inventory_batches_store_id_fkey(store_code)").in("status", ["AVAILABLE", "QUARANTINED"]).order("expiry_date").limit(200),
      supabase.from("expiry_alerts").select("alert_id, zone, days_until_expiry, resolved, batch_id").eq("resolved", false).order("days_until_expiry", { ascending: true }).limit(50),
      supabase.from("inventory_batches").select("id, batch_number, qc_status, quantity").eq("status", "QUARANTINED").limit(50),
      supabase.from("products").select("sku, name, category, shelf_life_days, current_price").limit(100),
    ]);

    const enriched = (batches ?? []).map((b: any) => {
      const days = Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000);
      const zone = days <= 2 ? "BLACK" : days <= 7 ? "RED" : days <= 14 ? "ORANGE" : days <= 30 ? "YELLOW" : "GREEN";
      return { ...b, daysLeft: days, zone };
    });

    const context = {
      generatedAt: today.toISOString(),
      totals: {
        batches: enriched.length,
        availableUnits: enriched.filter((b: any) => b.status === "AVAILABLE").reduce((s: number, b: any) => s + (b.quantity ?? 0), 0),
        quarantinedBatches: (quarantined ?? []).length,
        openAlerts: (alerts ?? []).length,
        criticalBatches: enriched.filter((b: any) => b.zone === "RED" || b.zone === "BLACK").length,
      },
      batches: enriched.slice(0, 80),
      products: products ?? [],
    };

    // Pre-compute store-level expiry risk ranking for context
    const storeBuckets: Record<string, { code: string; black: number; red: number; orange: number; yellow: number; units: number; batches: number }> = {};
    enriched.forEach((b: any) => {
      const code = b.stores?.store_code ?? "—";
      if (!storeBuckets[code]) storeBuckets[code] = { code, black: 0, red: 0, orange: 0, yellow: 0, units: 0, batches: 0 };
      storeBuckets[code].batches += 1;
      storeBuckets[code].units += b.quantity ?? 0;
      if (b.zone === "BLACK") storeBuckets[code].black += b.quantity ?? 0;
      else if (b.zone === "RED") storeBuckets[code].red += b.quantity ?? 0;
      else if (b.zone === "ORANGE") storeBuckets[code].orange += b.quantity ?? 0;
      else if (b.zone === "YELLOW") storeBuckets[code].yellow += b.quantity ?? 0;
    });
    const storeRisk = Object.values(storeBuckets)
      .map((s) => ({ ...s, riskScore: s.black * 4 + s.red * 2 + s.orange * 1 }))
      .sort((a, b) => b.riskScore - a.riskScore);

    const topRiskBatches = [...enriched]
      .filter((b: any) => ["BLACK", "RED", "ORANGE"].includes(b.zone) && (b.quantity ?? 0) > 0)
      .sort((a: any, b: any) => a.daysLeft - b.daysLeft)
      .slice(0, 20);

    (context as any).storeRiskRanking = storeRisk;
    (context as any).topRiskBatches = topRiskBatches;

    const systemPrompt = `You are CORTA AI, an expert assistant embedded in the CORTA WMS.
You answer questions about inventory, near-expiry stock, FEFO putaway, FEFO picking, quarantine, smart receiving, and markdown pricing using the live snapshot below.
Be concise (2-6 sentences), use bullet points / small tables where helpful, cite specific batch numbers, SKUs and store codes.

EXPIRY RISK RANKINGS — when asked for "risk ranking" / "which stores" / "which batches expire first", use the precomputed \`storeRiskRanking\` (sorted, BLACK weighted x4, RED x2, ORANGE x1) and \`topRiskBatches\` (FEFO order). Render a compact ranked list and ALWAYS link batches to /batch/{id} and stores to [Expiry Alerts](/expiry-alerts).

FEFO PICKING — for "picking plan" / "what to pick first" questions, output a numbered FEFO plan from the earliest-expiry AVAILABLE / qc_status=PASSED batches, including batch, qty, location, days-left and store.

PUTAWAY — for "where to put away" / "putaway suggestion" questions, recommend PICKFACE for batches whose expiry is earlier than the current pickface batch for that SKU/store, RESERVE otherwise. Explain in one sentence citing the comparison.

MARKDOWN — when asked for markdown recommendations, suggest discount tiers tied to zones (YELLOW 10–15%, ORANGE 25–35%, RED 40–60%, BLACK pull-from-sale) and ALWAYS include an explainable rationale citing days-left, quantity-at-risk and current_price. Mention that approvals are applied at [Markdown Approvals](/markdown-approvals).

QUARANTINE / QC — for "should I release / hold / write-off" questions, suggest one of RELEASE / EXTEND_HOLD / WRITE_OFF / RETURN_TO_SUPPLIER / ESCALATE_TO_QA, cite the batch, and add a link to [Quarantine](/quarantine).

ACTIONABLE LINKS — when you mention a specific batch, ALWAYS render it as a markdown link to /batch/{id}. Surface page links when useful:
- Receiving → [Receiving](/receiving)
- Quarantine → [Quarantine](/quarantine)
- Markdown approvals → [Markdown Approvals](/markdown-approvals)
- Expiry alerts → [Expiry Alerts](/expiry-alerts)
- Forecast → [Forecast](/forecast)
- Pick requests → [Pick Requests](/pick-requests)

End answers about near-expiry stock with 1–2 **recommended actions** tied to specific batches.
If asked about something outside the snapshot, say so and suggest a screen to check.

LIVE DATA SNAPSHOT (JSON):
${JSON.stringify(context).slice(0, 30000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...(messages || [])],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No response.";
    return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("wms-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});