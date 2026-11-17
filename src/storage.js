const DB_NAME = "muse-private-universe";
const DB_VERSION = 1;
const STORE = "entries";

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("IndexedDB unavailable"));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getEntries() {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result.sort((a,b) => b.createdAt - a.createdAt));
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("MUSE storage fallback:", error);
    return JSON.parse(localStorage.getItem("muse.entries.fallback") || "[]");
  }
}

export async function saveEntry(entry) {
  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(entry);
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    const entries = JSON.parse(localStorage.getItem("muse.entries.fallback") || "[]");
    const next = [entry, ...entries.filter(item => item.id !== entry.id)];
    localStorage.setItem("muse.entries.fallback", JSON.stringify(next));
  }
  return entry;
}

export async function deleteEntry(id) {
  try {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
      request.onsuccess = resolve;
      request.onerror = () => reject(request.error);
    });
  } catch {
    const entries = JSON.parse(localStorage.getItem("muse.entries.fallback") || "[]");
    localStorage.setItem("muse.entries.fallback", JSON.stringify(entries.filter(item => item.id !== id)));
  }
}

export function createId() {
  return globalThis.crypto?.randomUUID?.() || `muse-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
