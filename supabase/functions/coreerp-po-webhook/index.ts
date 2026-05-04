import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { event, data } = body;

    if (event === "po.created" || event === "po.updated") {
      const po = data;
      // Upsert PO
      await supabase.from("purchase_orders").upsert({
        po_number: po.poNumber,
        supplier_id: po.supplierId,
        supplier_name: po.supplierName,
        status: po.status || "OPEN",
        expected_delivery_date: po.expectedDeliveryDate,
      }, { onConflict: "po_number" });

      // Upsert PO lines
      if (po.lines && Array.isArray(po.lines)) {
        for (const line of po.lines) {
          // Find or create product
          let { data: product } = await supabase
            .from("products")
            .select("id")
            .eq("sku", line.sku)
            .single();

          if (!product) {
            const { data: newProd } = await supabase
              .from("products")
              .insert({ sku: line.sku, name: line.productName || line.sku })
              .select("id")
              .single();
            product = newProd;
          }

          // Get PO id
          const { data: poRec } = await supabase
            .from("purchase_orders")
            .select("id")
            .eq("po_number", po.poNumber)
            .single();

          if (poRec && product) {
            await supabase.from("po_lines").upsert({
              po_id: poRec.id,
              product_id: product.id,
              quantity_ordered: line.quantityOrdered,
              quantity_received: line.quantityReceived || 0,
            });
          }
        }
      }

      return new Response(JSON.stringify({ ok: true, event }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event === "receipt.confirmed") {
      const receipt = data;
      // Update PO line received qty
      if (receipt.poNumber && receipt.sku) {
        const { data: poRec } = await supabase
          .from("purchase_orders")
          .select("id")
          .eq("po_number", receipt.poNumber)
          .single();

        const { data: product } = await supabase
          .from("products")
          .select("id")
          .eq("sku", receipt.sku)
          .single();

        if (poRec && product) {
          const { data: poLine } = await supabase
            .from("po_lines")
            .select("id, quantity_received")
            .eq("po_id", poRec.id)
            .eq("product_id", product.id)
            .single();

          if (poLine) {
            await supabase.from("po_lines").update({
              quantity_received: (poLine.quantity_received || 0) + (receipt.quantityReceived || 0),
            }).eq("id", poLine.id);
          }
        }
      }

      return new Response(JSON.stringify({ ok: true, event }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown event type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("coreerp-po-webhook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});