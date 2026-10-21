import type { OfflineOperation } from "@/domain/operations";

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("adv.route.queue.v1", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("operations", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function putQueue(operation: OfflineOperation) {
  const database = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction("operations", "readwrite");
      tx.objectStore("operations").put(operation);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally { database.close(); }
}
export async function listQueue(): Promise<OfflineOperation[]> {
  const database = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction("operations", "readonly").objectStore("operations").getAll();
      request.onsuccess = () => resolve(request.result as OfflineOperation[]);
      request.onerror = () => reject(request.error);
    });
  } finally { database.close(); }
}