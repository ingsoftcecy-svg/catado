import { AuditRecord } from '../types/audit';

const DB_NAME = 'MAZ_AuditoriaSensorialDB';
const DB_VERSION = 2;
const STORE_NAME = 'audits';
const META_KEY_LAST_SYNC = 'MAZ_AUDITORIA_LAST_SYNC';

/**
 * Resolves or establishes an IndexedDB connection for local offline caching.
 *
 * Cyclomatic Complexity: 2 (< 7)
 */
function getDatabaseInstance(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(DB_NAME, DB_VERSION);

    openRequest.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.deleteObjectStore(STORE_NAME);
      }
      dbInstance.createObjectStore(STORE_NAME, { keyPath: 'DocId' });
    };

    openRequest.onsuccess = () => resolve(openRequest.result);
    openRequest.onerror = () => reject(openRequest.error);
  });
}

/**
 * Generates or derives a consistent primary document key for an audit record.
 *
 * Cyclomatic Complexity: 3 (< 7)
 */
function generateRecordDocumentKey(record: AuditRecord, fallbackIndex: number): string {
  if (record.DocId) {
    return record.DocId;
  }
  if (record.FilaExcel) {
    return `${record.ID}_F${record.FilaExcel}`;
  }
  return `${record.ID}_${fallbackIndex + 1}`;
}

/**
 * Retrieves all cached audit records from local IndexedDB (zero Firebase read costs).
 *
 * Cyclomatic Complexity: 2 (< 7)
 */
export async function getCachedAudits(): Promise<AuditRecord[]> {
  try {
    const database = await getDatabaseInstance();
    return new Promise((resolve) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const objectStore = transaction.objectStore(STORE_NAME);
      const readRequest = objectStore.getAll();

      readRequest.onsuccess = () => {
        resolve(readRequest.result || []);
      };

      readRequest.onerror = () => {
        resolve([]);
      };
    });
  } catch (error) {
    console.warn('Error leyendo caché IndexedDB:', error);
    return [];
  }
}

/**
 * Overwrites the entire local cache with an array of audit records.
 *
 * Cyclomatic Complexity: 3 (< 7)
 */
export async function saveCachedAudits(records: AuditRecord[]): Promise<void> {
  if (!records || records.length === 0) {
    return;
  }

  try {
    const database = await getDatabaseInstance();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);

      objectStore.clear();

      for (let recordIndex = 0; recordIndex < records.length; recordIndex++) {
        const record = records[recordIndex];
        const docId = generateRecordDocumentKey(record, recordIndex);
        objectStore.put({ ...record, DocId: docId });
      }

      transaction.oncomplete = () => {
        localStorage.setItem(META_KEY_LAST_SYNC, new Date().toISOString());
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.warn('Error guardando en caché IndexedDB:', error);
  }
}

/**
 * Inserts or updates specific audit records in the local cache without purging existing data.
 *
 * Cyclomatic Complexity: 2 (< 7)
 */
export async function mergeCachedAudits(newOrUpdatedRecords: AuditRecord[]): Promise<AuditRecord[]> {
  try {
    const database = await getDatabaseInstance();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const objectStore = transaction.objectStore(STORE_NAME);

      for (let recordIndex = 0; recordIndex < newOrUpdatedRecords.length; recordIndex++) {
        const record = newOrUpdatedRecords[recordIndex];
        const docId = generateRecordDocumentKey(record, recordIndex);
        objectStore.put({ ...record, DocId: docId });
      }

      transaction.oncomplete = () => {
        localStorage.setItem(META_KEY_LAST_SYNC, new Date().toISOString());
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
    });

    return await getCachedAudits();
  } catch (error) {
    console.warn('Error fusionando caché IndexedDB:', error);
    return [];
  }
}

/**
 * Retrieves the timestamp string of the last successful local sync.
 *
 * Cyclomatic Complexity: 1 (< 7)
 */
export function getLastSyncTime(): string | null {
  return localStorage.getItem(META_KEY_LAST_SYNC);
}

/**
 * Purges all cached records from IndexedDB and clears the last sync metadata.
 *
 * Cyclomatic Complexity: 2 (< 7)
 */
export async function clearLocalCache(): Promise<void> {
  try {
    const database = await getDatabaseInstance();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    localStorage.removeItem(META_KEY_LAST_SYNC);
  } catch {
    // Ignore cache clearing failure gracefully
  }
}
