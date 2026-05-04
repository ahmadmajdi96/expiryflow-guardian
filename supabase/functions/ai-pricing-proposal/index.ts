import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { items } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Items array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an AI Pricing Engine for a grocery/FMCG retailer's ExpirySmart WMS system.
Given near-expiry inventory items, propose optimal markdown pricing that:
1. Maximizes sell-through before expiry
2. Minimizes waste/write-offs
3. Maintains reasonable margins where possible
4. Considers days until expiry and current zone

Respond with a JSON array of pricing proposals.`;

    const userPrompt = `Analyze these near-expiry items and propose markdown pricing:
${JSON.stringify(items, null, 2)}

For each item, return: sku, batchNumber, currentPrice, proposedPrice, discountPercent, reasoning, urgency (LOW/MEDIUM/HIGH/CRITICAL)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let proposals = [];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        proposals = parsed.proposals || [];
      } catch {
        proposals = [];
      }
    }

    return new Response(JSON.stringify({ proposals }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-pricing-proposal error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});