import { supabase } from "@/integrations/supabase/client";

export interface FEFOSuggestion {
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  location: string | null;
  locationType: "PICKFACE" | "RESERVE";
  productName?: string;
}

/**
 * Get FEFO putaway suggestion for a product at a store.
 * Suggests PICKFACE if current pickface batch expires later than incoming;
 * otherwise RESERVE.
 */
export async function getFEFOPutawaySuggestion(
  productId: string,
  storeId: string,
  incomingExpiryDate: string
): Promise<{ locationType: "PICKFACE" | "RESERVE"; locationCode: string; reason: string }> {
  // Get current pickface batches for same product/store
  const { data: pickfaceBatches } = await supabase
    .from("inventory_batches")
    .select("*")
    .eq("product_id", productId)
    .eq("store_id", storeId)
    .eq("status", "AVAILABLE")
    .like("location", "PICKFACE%")
    .order("expiry_date", { ascending: true })
    .limit(1);

  const currentPickface = pickfaceBatches?.[0];

  if (!currentPickface) {
    // No pickface batch — incoming goes to pickface
    return {
      locationType: "PICKFACE",
      locationCode: `PICKFACE-${storeId.slice(-2).toUpperCase()}01`,
      reason: "No existing pickface batch. Incoming batch placed at pickface for immediate picking.",
    };
  }

  if (incomingExpiryDate <= currentPickface.expiry_date) {
    // Incoming expires sooner — should go to pickface (FEFO)
    return {
      locationType: "PICKFACE",
      locationCode: currentPickface.location || "PICKFACE-A01",
      reason: `Incoming batch expires ${incomingExpiryDate} before current pickface ${currentPickface.expiry_date}. Swap to maintain FEFO.`,
    };
  }

  // Incoming expires later — store in reserve
  return {
    locationType: "RESERVE",
    locationCode: `RESERVE-${storeId.slice(-2).toUpperCase()}${String(Math.floor(Math.random() * 20) + 1).padStart(2, "0")}`,
    reason: `Current pickface batch expires sooner (${currentPickface.expiry_date}). Incoming stored in reserve.`,
  };
}

/**
 * Get FEFO picking allocation — always picks earliest-expiry available batch first.
 */
export async function getFEFOPickingSuggestion(
  productId: string,
  storeId: string,
  requestedQty: number
): Promise<FEFOSuggestion[]> {
  const { data: batches } = await supabase
    .from("inventory_batches")
    .select("id, batch_number, expiry_date, quantity, location")
    .eq("product_id", productId)
    .eq("store_id", storeId)
    .eq("status", "AVAILABLE")
    .eq("qc_status", "PASSED")
    .gt("quantity", 0)
    .order("expiry_date", { ascending: true });

  if (!batches) return [];

  const suggestions: FEFOSuggestion[] = [];
  let remaining = requestedQty;

  for (const b of batches) {
    if (remaining <= 0) break;
    const allocate = Math.min(remaining, b.quantity);
    suggestions.push({
      batchId: b.id,
      batchNumber: b.batch_number,
      expiryDate: b.expiry_date,
      quantity: allocate,
      location: b.location,
      locationType: b.location?.startsWith("PICKFACE") ? "PICKFACE" : "RESERVE",
    });
    remaining -= allocate;
  }

  return suggestions;
}