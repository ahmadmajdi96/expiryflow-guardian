import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, userId } = await req.json();
    if (!text || typeof text !== "string") return new Response(JSON.stringify({ error: "text is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const systemPrompt = `You parse messy supplier delivery notes / batch labels / OCR output for a WMS Receiving form.
Extract the best-guess values. If unsure, leave field null.
Normalize expiry to YYYY-MM-DD (assume current century for 2-digit years; if only month/year, use last day of month).
Return strictly via the tool.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Parse this:\n\n${text}` },
        ],
        tools: [{ type: "function", function: { name: "extract", description: "Extract receiving fields", parameters: {
          type: "object",
          properties: {
            sku: { type: ["string","null"] },
            batchNumber: { type: ["string","null"] },
            expiryDate: { type: ["string","null"], description: "YYYY-MM-DD" },
            manufacturingDate: { type: ["string","null"], description: "YYYY-MM-DD" },
            quantity: { type: ["number","null"] },
            location: { type: ["string","null"] },
            confidence: { type: "string", enum: ["LOW","MEDIUM","HIGH"] },
            notes: { type: ["string","null"] },
          },
          required: ["confidence"],
          additionalProperties: false,
        }}}],
        tool_choice: { type: "function", function: { name: "extract" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : null;

    const { data: audit } = await supabase.from("ai_audit_log").insert({
      feature: "SMART_RECEIVING",
      prompt: systemPrompt,
      input: { text: text.slice(0, 4000) },
      output: parsed ?? {},
      confidence: parsed?.confidence ?? null,
      user_id: userId ?? null,
    }).select("id").single();

    return new Response(JSON.stringify({ parsed, auditId: audit?.id ?? null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("wms-receiving-parse error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});