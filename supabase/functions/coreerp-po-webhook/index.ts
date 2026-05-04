import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  let event = "unknown";
  let poNumber: string | null = null;
  let sku: string | null = null;
  let payload: Record<string, unknown> = {};

  try {
    const body = await req.json();
    event = body.event ?? "unknown";
    const data = body.data ?? {};
    payload = body;
    poNumber = data.poNumber ?? null;

    if (event === "po.created" || event === "po.updated") {
      const po = data;
      await supabase.from("purchase_orders").upsert({
        po_number: po.poNumber,
        supplier_id: po.supplierId,
        supplier_name: po.supplierName,
        status: po.status || "OPEN",
        expected_delivery_date: po.expectedDeliveryDate,
      }, { onConflict: "po_number" });

      if (po.lines && Array.isArray(po.lines)) {
        for (const line of po.lines) {
          let { data: product } = await supabase
            .from("products").select("id").eq("sku", line.sku).single();
          if (!product) {
            const { data: newProd } = await supabase
              .from("products").insert({ sku: line.sku, name: line.productName || line.sku }).select("id").single();
            product = newProd;
          }
          const { data: poRec } = await supabase
            .from("purchase_orders").select("id").eq("po_number", po.poNumber).single();
          if (poRec && product) {
            await supabase.from("po_lines").upsert({
              po_id: poRec.id, product_id: product.id,
              quantity_ordered: line.quantityOrdered,
              quantity_received: line.quantityReceived || 0,
            });
          }

          // Log each line
          await supabase.from("webhook_event_log").insert({
            event_type: event, po_number: po.poNumber, sku: line.sku,
            payload: { poNumber: po.poNumber, sku: line.sku, quantityOrdered: line.quantityOrdered },
            status: "SUCCESS",
          });
        }
      } else {
        await supabase.from("webhook_event_log").insert({
          event_type: event, po_number: po.poNumber, payload: data, status: "SUCCESS",
        });
      }

      return new Response(JSON.stringify({ ok: true, event }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event === "receipt.confirmed") {
      const receipt = data;
      sku = receipt.sku ?? null;
      poNumber = receipt.poNumber ?? null;

      if (receipt.poNumber && receipt.sku) {
        const { data: poRec } = await supabase
          .from("purchase_orders").select("id").eq("po_number", receipt.poNumber).single();
        const { data: product } = await supabase
          .from("products").select("id").eq("sku", receipt.sku).single();

        if (poRec && product) {
          const { data: poLine } = await supabase
            .from("po_lines").select("id, quantity_received")
            .eq("po_id", poRec.id).eq("product_id", product.id).single();
          if (poLine) {
            await supabase.from("po_lines").update({
              quantity_received: (poLine.quantity_received || 0) + (receipt.quantityReceived || 0),
            }).eq("id", poLine.id);
          }
        }
      }

      await supabase.from("webhook_event_log").insert({
        event_type: event, po_number: poNumber, sku,
        payload: data, status: "SUCCESS",
      });

      return new Response(JSON.stringify({ ok: true, event }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Unknown event
    await supabase.from("webhook_event_log").insert({
      event_type: event, po_number: poNumber, sku, payload, status: "UNKNOWN_EVENT",
      error_message: `Unrecognized event type: ${event}`,
    });

    return new Response(JSON.stringify({ error: "Unknown event type" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("coreerp-po-webhook error:", e);
    const errMsg = e instanceof Error ? e.message : "Unknown error";
    // Log the failure
    try {
      await supabase.from("webhook_event_log").insert({
        event_type: event, po_number: poNumber, sku, payload, status: "ERROR", error_message: errMsg,
      });
    } catch { /* best effort */ }

    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});