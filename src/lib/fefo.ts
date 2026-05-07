import { supabase } from "@/integrations/supabase/client";

export interface TransferSuggestion {
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  fromStoreId: string;
  fromLocation: string | null;
  productName?: string;
  daysLeft: number;
}

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
    .select("id, batch_number, expiry_date, quantity, location, reserved_quantity")
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
    const available = b.quantity - (b.reserved_quantity ?? 0);
    if (available <= 0) continue;
    const allocate = Math.min(remaining, available);
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

/**
 * Get FEFO transfer suggestion — picks earliest-expiry batches from source store
 * to balance inventory to destination store, respecting FEFO ordering.
 */
export async function getFEFOTransferSuggestion(
  productId: string,
  fromStoreId: string,
  requestedQty: number
): Promise<TransferSuggestion[]> {
  const { data: batches } = await supabase
    .from("inventory_batches")
    .select("id, batch_number, expiry_date, quantity, location, product_id, store_id, reserved_quantity")
    .eq("product_id", productId)
    .eq("store_id", fromStoreId)
    .eq("status", "AVAILABLE")
    .eq("qc_status", "PASSED")
    .gt("quantity", 0)
    .order("expiry_date", { ascending: true });

  if (!batches) return [];

  const suggestions: TransferSuggestion[] = [];
  let remaining = requestedQty;
  const today = new Date();

  for (const b of batches) {
    if (remaining <= 0) break;
    const available = b.quantity - (b.reserved_quantity ?? 0);
    if (available <= 0) continue;
    const allocate = Math.min(remaining, available);
    const daysLeft = Math.ceil((new Date(b.expiry_date).getTime() - today.getTime()) / 86400000);
    suggestions.push({
      batchId: b.id,
      batchNumber: b.batch_number,
      expiryDate: b.expiry_date,
      quantity: allocate,
      fromStoreId: b.store_id,
      fromLocation: b.location,
      daysLeft,
    });
    remaining -= allocate;
  }

  return suggestions;
}