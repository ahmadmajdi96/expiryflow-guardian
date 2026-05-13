import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { productId, storeId, incomingExpiryDate, batchNumber, quantity, userId } = await req.json();
    if (!productId || !storeId || !incomingExpiryDate) {
      return new Response(JSON.stringify({ error: "productId, storeId, incomingExpiryDate required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Pull existing batches for same product/store, sorted by expiry
    const { data: existing } = await supabase
      .from("inventory_batches")
      .select("batch_number, expiry_date, quantity, location, status")
      .eq("product_id", productId)
      .eq("store_id", storeId)
      .in("status", ["AVAILABLE", "QUARANTINED"])
      .order("expiry_date", { ascending: true })
      .limit(20);

    const today = new Date();
    const incomingDays = Math.ceil((new Date(incomingExpiryDate).getTime() - today.getTime()) / 86400000);
    const enriched = (existing ?? []).map((b: any) => ({
      ...b,
      daysLeft: Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000),
      zone: b.location?.startsWith("PICKFACE") ? "PICKFACE" : "RESERVE",
    }));
    const currentPickface = enriched.find((b: any) => b.zone === "PICKFACE");

    const systemPrompt = `You are a FEFO putaway optimization AI for a WMS.
Decide where to put away an incoming batch (PICKFACE or RESERVE) and propose a specific location code.
FEFO rule: the batch with the EARLIEST expiry must be at the pickface, so it sells first.
Return strictly via the tool. The "whyThisLocation" field MUST cite specific dates / batch numbers from the snapshot.`;

    const userPrompt = `Incoming batch:
${JSON.stringify({ batchNumber, quantity, expiryDate: incomingExpiryDate, daysUntilExpiry: incomingDays }, null, 2)}

Existing batches at this store for this product (FEFO order):
${JSON.stringify(enriched, null, 2)}

Current pickface batch: ${currentPickface ? `${currentPickface.batch_number} expires ${currentPickface.expiry_date} (${currentPickface.daysLeft}d)` : "NONE"}.
Suggest a location code like PICKFACE-A01 or RESERVE-B07.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        tools: [{ type: "function", function: { name: "putaway", description: "Putaway recommendation", parameters: {
          type: "object",
          properties: {
            locationType: { type: "string", enum: ["PICKFACE", "RESERVE"] },
            locationCode: { type: "string" },
            swapWithBatch: { type: ["string", "null"], description: "Existing batch number to displace if PICKFACE swap is recommended" },
            whyThisLocation: { type: "string", description: "1-3 sentences explaining FEFO reasoning citing dates/batches" },
            confidence: { type: "string", enum: ["LOW","MEDIUM","HIGH"] },
          },
          required: ["locationType","locationCode","whyThisLocation","confidence"],
          additionalProperties: false,
        }}}],
        tool_choice: { type: "function", function: { name: "putaway" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const data = await aiResp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const recommendation = args ? JSON.parse(args) : null;

    // Audit log
    const { data: audit } = await supabase.from("ai_audit_log").insert({
      feature: "PUTAWAY_RECOMMEND",
      prompt: systemPrompt,
      input: { productId, storeId, incomingExpiryDate, batchNumber, quantity, snapshotCount: enriched.length },
      output: recommendation ?? {},
      confidence: recommendation?.confidence ?? null,
      user_id: userId ?? null,
    }).select("id").single();

    return new Response(JSON.stringify({ recommendation, auditId: audit?.id ?? null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("wms-putaway-recommend error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});