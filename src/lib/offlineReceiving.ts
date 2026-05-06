/**
 * Offline Receiving — IndexedDB queue + navigator.onLine sync
 * When offline, receiving confirmations are saved to IndexedDB.
 * When connectivity returns, queued items are synced to Supabase.
 */

const DB_NAME = "corta-wms-offline";
const STORE_NAME = "receiving-queue";
const DB_VERSION = 1;

export interface OfflineReceivingItem {
  id: string;
  timestamp: number;
  payload: {
    batch_number: string;
    product_id: string;
    store_id: string;
    quantity: number;
    expiry_date: string;
    manufacturing_date: string | null;
    location: string;
    po_line_id: string;
    received_by: string | null;
  };
  synced: boolean;
}

export interface SyncConflict {
  item: OfflineReceivingItem;
  reason: string;
  serverBatchNumber?: string;
}

export interface SyncResult {
  synced: number;
  conflicts: SyncConflict[];
  failed: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueOfflineReceiving(item: Omit<OfflineReceivingItem, "synced">): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ ...item, synced: false });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingItems(): Promise<OfflineReceivingItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve((req.result ?? []).filter((r: OfflineReceivingItem) => !r.synced));
    req.onerror = () => reject(req.error);
  });
}

export async function markSynced(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        store.put({ ...getReq.result, synced: true });
      }
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueueCount(): Promise<number> {
  const items = await getPendingItems();
  return items.length;
}

export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Sync all pending items to Supabase.
 * Returns number of successfully synced items.
 */
export async function clearSynced(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const items = (req.result ?? []) as OfflineReceivingItem[];
      for (const item of items) {
        if (item.synced) store.delete(item.id);
      }
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function syncPendingItems(): Promise<SyncResult> {
  if (!isOnline()) return { synced: 0, conflicts: [], failed: 0 };
  const { supabase } = await import("@/integrations/supabase/client");
  const pending = await getPendingItems();
  let synced = 0;
  const conflicts: SyncConflict[] = [];
  let failed = 0;

  for (const item of pending) {
    try {
      // Check for duplicate batch_number (conflict detection)
      const { data: existing } = await supabase
        .from("inventory_batches")
        .select("id, batch_number")
        .eq("batch_number", item.payload.batch_number)
        .eq("product_id", item.payload.product_id)
        .eq("store_id", item.payload.store_id)
        .maybeSingle();

      if (existing) {
        // Duplicate — mark as conflict but mark synced to stop retrying
        conflicts.push({
          item,
          reason: `Batch ${item.payload.batch_number} already exists on server (likely synced by another device).`,
          serverBatchNumber: existing.batch_number,
        });
        await markSynced(item.id);
        continue;
      }

      // Check PO line to avoid over-receiving
      if (item.payload.po_line_id) {
        const { data: poLine } = await supabase
          .from("po_lines")
          .select("quantity_ordered, quantity_received")
          .eq("id", item.payload.po_line_id)
          .maybeSingle();

        if (poLine && poLine.quantity_received >= poLine.quantity_ordered) {
          conflicts.push({
            item,
            reason: `PO line already fully received (${poLine.quantity_received}/${poLine.quantity_ordered}). Offline receipt of ${item.payload.quantity} skipped.`,
          });
          await markSynced(item.id);
          continue;
        }
      }

      const { error } = await supabase.from("inventory_batches").insert({
        batch_number: item.payload.batch_number,
        product_id: item.payload.product_id,
        store_id: item.payload.store_id,
        quantity: item.payload.quantity,
        expiry_date: item.payload.expiry_date,
        manufacturing_date: item.payload.manufacturing_date,
        location: item.payload.location,
        po_line_id: item.payload.po_line_id,
        received_by: item.payload.received_by,
        status: "AVAILABLE",
        qc_status: "PENDING",
      } as any);

      if (!error) {
        // Update PO line received qty
        if (item.payload.po_line_id) {
          const { data: poLine } = await supabase
            .from("po_lines")
            .select("quantity_received")
            .eq("id", item.payload.po_line_id)
            .maybeSingle();
          if (poLine) {
            await supabase.from("po_lines").update({
              quantity_received: (poLine.quantity_received ?? 0) + item.payload.quantity,
            }).eq("id", item.payload.po_line_id);
          }
        }
        await markSynced(item.id);
        synced++;
      } else {
        console.warn(`[OfflineSync] Failed to sync ${item.id}:`, error.message);
        failed++;
      }
    } catch (err) {
      console.warn(`[OfflineSync] Exception syncing ${item.id}:`, err);
      failed++;
    }
  }

  // Clean up old synced items
  await clearSynced();

  return { synced, conflicts, failed };
}