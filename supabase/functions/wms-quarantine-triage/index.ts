import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { batchId, inspectorNotes } = await req.json();
    if (!batchId) return new Response(JSON.stringify({ error: "batchId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: batch } = await supabase
      .from("inventory_batches")
      .select("*, products!inventory_batches_product_id_fkey(sku, name, category, shelf_life_days)")
      .eq("id", batchId)
      .single();

    const { data: inspections } = await supabase
      .from("qc_inspections")
      .select("result, notes, inspected_at")
      .eq("batch_id", batchId)
      .order("inspected_at", { ascending: false })
      .limit(5);

    const today = new Date();
    const days = batch ? Math.ceil((new Date(batch.expiry_date).getTime() - today.getTime()) / 86400000) : null;

    const systemPrompt = `You are a food-safety/QC triage AI for a WMS. Given a quarantined batch with inspector notes, suggest:
- holdReason (short categorical: e.g. "Temperature breach", "Damaged packaging", "Suspected contamination", "Label/spec mismatch", "Near expiry", "Pending lab result")
- severity (LOW | MEDIUM | HIGH | CRITICAL)
- recommendedAction (RELEASE | EXTEND_HOLD | WRITE_OFF | RETURN_TO_SUPPLIER | ESCALATE_TO_QA)
- rationale (1-3 sentences citing notes/category/expiry)
- followUpChecks (array of 1-4 short next steps)
Return strictly via the tool.`;

    const userPrompt = `Batch:
${JSON.stringify({ ...batch, daysUntilExpiry: days, recentInspections: inspections, additionalNotesFromUser: inspectorNotes || null }, null, 2)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        tools: [{ type: "function", function: { name: "triage", description: "Return triage decision", parameters: {
          type: "object",
          properties: {
            holdReason: { type: "string" },
            severity: { type: "string", enum: ["LOW","MEDIUM","HIGH","CRITICAL"] },
            recommendedAction: { type: "string", enum: ["RELEASE","EXTEND_HOLD","WRITE_OFF","RETURN_TO_SUPPLIER","ESCALATE_TO_QA"] },
            rationale: { type: "string" },
            followUpChecks: { type: "array", items: { type: "string" } },
          },
          required: ["holdReason","severity","recommendedAction","rationale","followUpChecks"],
          additionalProperties: false,
        }}}],
        tool_choice: { type: "function", function: { name: "triage" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const triage = args ? JSON.parse(args) : null;
    return new Response(JSON.stringify({ triage }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("wms-quarantine-triage error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});