/**
 * Local IndexedDB Storage Service for Prime Proposal Report
 * Provides unlimited, reliable local persistence for Master Libraries and Proposals
 * eliminating the 5MB browser quota of LocalStorage and bypassing Cloud instability.
 */

const DB_NAME = 'PrimeLocalDataStore_v2';
const DB_VERSION = 1;

export const IDB_STORES = {
  MASTER_PROJECTS: 'master_projects',
  MASTER_TEAM: 'master_team',
  MASTER_BOM: 'master_bom',
  MASTER_COMPANY: 'master_company',
  BIDDING_PROJECTS: 'bidding_projects',
} as const;

let dbPromise: Promise<IDBDatabase | null> | null = null;

export function openLocalDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e: any) => {
        const db = e.target.result as IDBDatabase;
        // Key-value store for single documents / arrays
        Object.values(IDB_STORES).forEach((store) => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        });
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = (err) => {
        console.warn('Could not open IndexedDB:', err);
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB exception:', err);
      resolve(null);
    }
  });

  return dbPromise;
}

export async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openLocalDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => {
        const result = req.result;
        resolve(result && result.payload !== undefined ? (result.payload as T) : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbSet<T>(storeName: string, key: string, payload: T): Promise<void> {
  const db = await openLocalDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put({ id: key, payload, updatedAt: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function idbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openLocalDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result || [];
        resolve(results.map((r: any) => r.payload).filter((p: any) => p !== undefined));
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openLocalDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
