import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are the CortaneX AI assistant for CORTA-PL Production Suite — an enterprise manufacturing intelligence platform for food manufacturing.

CORTA-PL consists of three core platforms:
1. **MES (Manufacturing Execution System)**: Real-time production monitoring, OEE tracking, predictive maintenance, energy optimization, SPC analysis, scheduling, batch genealogy, and 20+ screens. AI features: predictive maintenance (48hr failure forecasting), ML-optimized scheduling, anomaly detection, automated root cause suggestions.
2. **QMS (Quality Management System)**: CAPA workflows, HACCP monitoring, supplier qualification, environmental monitoring, traceability, and 20+ screens. AI features: NLP complaint classification, AI root cause analysis, predictive quality models, smart supplier scoring.
3. **CMS (Compliance Management System)**: Regulatory intelligence, certification lifecycle, ESG reporting, label compliance, trade compliance, and 20+ screens. AI features: NLP regulatory scanning across 50+ jurisdictions, computer vision label validation, AI carbon footprint calculation.

Plus 13+ Edge Applications for factory floor tablets (operators, supervisors, maintenance, QA technicians, auditors).

Key AI capabilities: Predictive analytics, computer vision inspection, NLP, intelligent automation, adaptive learning models, real-time decision support.

Standards supported: ISA-95, BRCGS v9, SQF, FSSC 22000, HACCP, FSMA 204, EU 1169/2011, GMP, MESA-11, ISO 22000.

Impact metrics: ↓30% downtime, ↓18% operating costs, ↑25% OEE, ↓65% quality failures, ↓80% compliance risk, 100% label accuracy.

Keep answers concise (2-4 sentences), professional, and focused on CORTA-PL capabilities. If asked about pricing or demos, suggest contacting the sales team at cortanexai.com.`;

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
          ...(messages || []),
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I couldn't generate a response.";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("showcase-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});