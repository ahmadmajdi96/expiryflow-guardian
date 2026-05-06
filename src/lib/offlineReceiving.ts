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
export async function syncPendingItems(): Promise<number> {
  if (!isOnline()) return 0;
  const { supabase } = await import("@/integrations/supabase/client");
  const pending = await getPendingItems();
  let synced = 0;
  for (const item of pending) {
    try {
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
      });
      if (!error) {
        await markSynced(item.id);
        synced++;
      }
    } catch {
      // Will retry on next sync
    }
  }
  return synced;
}