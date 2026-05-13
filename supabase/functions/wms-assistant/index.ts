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

    const systemPrompt = `You are CORTA AI, an expert assistant embedded in the CORTA ExpirySmart WMS.
You answer questions about inventory, near-expiry stock, FEFO, quarantine, and operations using the live snapshot below.
Be concise (2-5 sentences), use bullet points where helpful, cite specific batch numbers/SKUs when relevant.

ACTIONABLE LINKS — when you mention a specific batch, ALWAYS render it as a markdown link to /batch/{id}, e.g. [B240501-001](/batch/<uuid>).
Also surface relevant page links when useful:
- Quarantine triage → [Quarantine](/quarantine)
- Markdown approvals → [Markdown Approvals](/markdown-approvals)
- Expiry alerts → [Expiry Alerts](/expiry-alerts)
- Forecast → [Forecast](/forecast)

End answers about near-expiry stock with one or two **recommended actions** (e.g. "Propose markdown", "Move to PICKFACE", "Create write-off task") tied to specific batches.
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