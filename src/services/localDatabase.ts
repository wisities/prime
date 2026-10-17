/**
 * Local IndexedDB Storage Service for Prime Proposal Report
 * Provides unlimited, reliable local persistence for Master Libraries and Proposals
 * eliminating the 5MB browser quota of LocalStorage and bypassing Cloud instability.
 */

const DB_NAME = 'PrimeLocalDataStore_v2';
const DB_VERSION = 2;

export const IDB_STORES = {
  MASTER_PROJECTS: 'master_projects',
  MASTER_TEAM: 'master_team',
  MASTER_BOM: 'master_bom',
  MASTER_COMPANY: 'master_company',
  BIDDING_PROJECTS: 'bidding_projects',
  DRAFT_BACKUPS: 'draft_backups',
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
        dbPromise = null;
        resolve(null);
      };
      req.onblocked = () => {
        console.warn('IndexedDB version upgrade blocked by another connection');
        dbPromise = null;
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB exception:', err);
      dbPromise = null;
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

export interface DraftBackupSnapshot {
  id: string; // `${projectId}_${timestamp}`
  projectId: string;
  projectTitle: string;
  projectCode: string;
  savedAt: string;
  savedTimeFormatted: string;
  triggerType: 'manual' | 'auto';
  proposalData: any;
}

/**
 * บันทึกประวัติร่าง (Snapshot) ลง IndexedDB เพื่อกู้คืนย้อนหลังได้เสมอ
 * จำกัดไว้ที่ 5 รายการล่าสุดต่อโครงการ โดยใช้ Key Cursor เพื่อไม่ให้เกิด Out of Memory
 */
export async function saveDraftSnapshot(
  projectId: string,
  projectTitle: string,
  projectCode: string,
  proposalData: any,
  triggerType: 'manual' | 'auto' = 'manual'
): Promise<void> {
  if (!projectId || !proposalData) return;
  const now = new Date();
  const timestamp = now.getTime();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const dateStr = `${now.toLocaleDateString('th-TH')} ${timeStr} น.`;

  const snapshot: DraftBackupSnapshot = {
    id: `${projectId}_${timestamp}`,
    projectId,
    projectTitle: projectTitle || 'โครงการไม่ระบุชื่อ',
    projectCode: projectCode || '',
    savedAt: now.toISOString(),
    savedTimeFormatted: dateStr,
    triggerType,
    proposalData: JSON.parse(JSON.stringify(proposalData)),
  };

  const db = await openLocalDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORES.DRAFT_BACKUPS, 'readwrite');
      const store = tx.objectStore(IDB_STORES.DRAFT_BACKUPS);

      // บันทึก Snapshot ฉบับใหม่
      store.put({ id: snapshot.id, payload: snapshot, updatedAt: now.toISOString() });

      // ทำความสะอาดแบบ Cursor ประหยัดหน่วยความจำ: เก็บเฉพาะ 5 รายการล่าสุดของโครงการนี้เท่านั้น
      // โดยวนเฉพาะ Key ID ของโครงการนี้ (IDBKeyRange) และลบส่วนที่เกินทันที ไม่โหลด Payload เข้า RAM
      const range = IDBKeyRange.bound(`${projectId}_0`, `${projectId}_\uffff`);
      const keyReq = store.openKeyCursor ? store.openKeyCursor(range, 'prev') : store.openCursor(range, 'prev');
      let count = 0;

      keyReq.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor) {
          count++;
          if (count > 5) {
            store.delete(cursor.primaryKey || cursor.key);
          }
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch (err) {
      console.warn('Failed to save draft snapshot:', err);
      resolve();
    }
  });
}

/**
 * ดึงรายการสำเนาร่างย้อนหลังของโครงการ (เฉพาะโครงการที่ระบุ สูงสุด 5 รายการล่าสุด)
 * ใช้ IDBKeyRange ไม่โหลดโครงการอื่น และหยุดค้นหาทันทีที่ได้ครบ
 */
export async function getDraftSnapshots(projectId: string): Promise<DraftBackupSnapshot[]> {
  if (!projectId) return [];
  const db = await openLocalDB();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORES.DRAFT_BACKUPS, 'readonly');
      const store = tx.objectStore(IDB_STORES.DRAFT_BACKUPS);
      const range = IDBKeyRange.bound(`${projectId}_0`, `${projectId}_\uffff`);
      const req = store.openCursor(range, 'prev');
      const results: DraftBackupSnapshot[] = [];

      req.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor && results.length < 5) {
          if (cursor.value && cursor.value.payload) {
            results.push(cursor.value.payload as DraftBackupSnapshot);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => resolve([]);
    } catch (err) {
      console.warn('Failed to get draft snapshots:', err);
      resolve([]);
    }
  });
}

