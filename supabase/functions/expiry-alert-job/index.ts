import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Threshold: batches expiring within this many days trigger an alert + AI pricing proposal */
const NEAR_EXPIRY_DAYS = 14;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1. Find near-expiry AVAILABLE batches (≤ NEAR_EXPIRY_DAYS) that don't already have a pending proposal
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + NEAR_EXPIRY_DAYS);

    const { data: batches, error: bErr } = await supabase
      .from("inventory_batches")
      .select("id, batch_number, product_id, store_id, quantity, expiry_date, products!inventory_batches_product_id_fkey(sku, name, current_price, unit_cost), stores!inventory_batches_store_id_fkey(store_code)")
      .eq("status", "AVAILABLE")
      .lte("expiry_date", cutoff.toISOString().slice(0, 10))
      .order("expiry_date", { ascending: true });

    if (bErr) throw bErr;
    if (!batches || batches.length === 0) {
      return new Response(JSON.stringify({ message: "No near-expiry batches found", created: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Filter out batches that already have a pending/approved proposal
    const batchIds = batches.map((b: any) => b.id);
    const { data: existing } = await supabase
      .from("markdown_proposals")
      .select("batch_id")
      .in("batch_id", batchIds)
      .in("status", ["pending", "approved"]);

    const existingSet = new Set((existing ?? []).map((e: any) => e.batch_id));
    const newBatches = batches.filter((b: any) => !existingSet.has(b.id));

    if (newBatches.length === 0) {
      return new Response(JSON.stringify({ message: "All near-expiry batches already have proposals", created: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Build AI input items
    const today = new Date();
    const items = newBatches.map((b: any) => {
      const daysLeft = Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000);
      let zone = "GREEN";
      if (daysLeft <= 2) zone = "BLACK";
      else if (daysLeft <= 7) zone = "RED";
      else if (daysLeft <= 14) zone = "ORANGE";
      else if (daysLeft <= 30) zone = "YELLOW";
      return {
        sku: b.products?.sku ?? "UNKNOWN",
        name: b.products?.name ?? "",
        batchNumber: b.batch_number,
        quantity: b.quantity,
        currentPrice: b.products?.current_price ?? 0,
        unitCost: b.products?.unit_cost ?? 0,
        daysUntilExpiry: daysLeft,
        zone,
        store: b.stores?.store_code ?? "",
      };
    });

    // 4. Call AI Pricing Engine
    const systemPrompt = `You are an AI Pricing Engine for a grocery/FMCG retailer's ExpirySmart WMS system.
Given near-expiry inventory items, propose optimal markdown pricing that:
1. Maximizes sell-through before expiry
2. Minimizes waste/write-offs
3. Maintains reasonable margins where possible
4. Considers days until expiry, current zone, and unit cost

Rules:
- BLACK zone (≤2 days): 50-80% discount, urgency CRITICAL
- RED zone (3-7 days): 30-50% discount, urgency HIGH
- ORANGE zone (8-14 days): 15-30% discount, urgency MEDIUM
- Never price below unit cost unless ≤3 days to expiry`;

    const userPrompt = `Analyze these ${items.length} near-expiry items and propose markdown pricing:\n${JSON.stringify(items, null, 2)}\n\nFor each item, return: sku, batchNumber, currentPrice, proposedPrice, discountPercent, reasoning, urgency (LOW/MEDIUM/HIGH/CRITICAL)`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "propose_markdowns",
            description: "Return markdown pricing proposals for near-expiry items",
            parameters: {
              type: "object",
              properties: {
                proposals: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      sku: { type: "string" },
                      batchNumber: { type: "string" },
                      currentPrice: { type: "number" },
                      proposedPrice: { type: "number" },
                      discountPercent: { type: "number" },
                      reasoning: { type: "string" },
                      urgency: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
                    },
                    required: ["sku", "batchNumber", "currentPrice", "proposedPrice", "discountPercent", "reasoning", "urgency"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["proposals"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "propose_markdowns" } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      return new Response(JSON.stringify({ error: `AI gateway error: ${aiResp.status}` }), {
        status: aiResp.status === 429 ? 429 : aiResp.status === 402 ? 402 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let proposals: any[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        proposals = parsed.proposals || [];
      } catch { proposals = []; }
    }

    // 5. Match proposals to batches and insert markdown_proposals + expiry_alerts
    const batchMap = new Map<string, any>();
    for (const b of newBatches) {
      batchMap.set(b.batch_number, b);
    }

    const proposalRows: any[] = [];
    const alertRows: any[] = [];

    for (const p of proposals) {
      const batch = batchMap.get(p.batchNumber);
      if (!batch) continue;

      const daysLeft = Math.ceil((new Date(batch.expiry_date).getTime() - today.getTime()) / 86400000);
      let zone = "GREEN";
      if (daysLeft <= 2) zone = "BLACK";
      else if (daysLeft <= 7) zone = "RED";
      else if (daysLeft <= 14) zone = "ORANGE";
      else if (daysLeft <= 30) zone = "YELLOW";

      proposalRows.push({
        batch_id: batch.id,
        batch_number: batch.batch_number,
        sku: batch.products?.sku ?? p.sku,
        current_price: p.currentPrice,
        proposed_price: p.proposedPrice,
        discount_percent: p.discountPercent,
        reasoning: p.reasoning,
        urgency: p.urgency,
        status: "pending",
      });

      alertRows.push({
        alert_id: `AUTO-${batch.batch_number}-${Date.now()}`,
        batch_id: batch.id,
        zone,
        days_until_expiry: daysLeft,
        action_taken: `AI markdown proposed: ${p.discountPercent}% off → $${p.proposedPrice}`,
      });
    }

    let insertedCount = 0;

    if (proposalRows.length > 0) {
      const { error: pErr } = await supabase.from("markdown_proposals").insert(proposalRows);
      if (pErr) console.error("Insert proposals error:", pErr);
      else insertedCount = proposalRows.length;
    }

    if (alertRows.length > 0) {
      const { error: aErr } = await supabase.from("expiry_alerts").insert(alertRows);
      if (aErr) console.error("Insert alerts error:", aErr);
    }

    console.log(`Expiry alert job: scanned ${batches.length} batches, ${newBatches.length} new, created ${insertedCount} proposals`);

    return new Response(JSON.stringify({
      message: "Expiry alert job completed",
      scanned: batches.length,
      newBatches: newBatches.length,
      created: insertedCount,
      proposals: proposalRows.map(p => ({ sku: p.sku, batch: p.batch_number, discount: p.discount_percent, urgency: p.urgency })),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("expiry-alert-job error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});