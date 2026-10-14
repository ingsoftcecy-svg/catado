import { AuditRecord } from '../types/audit';

const DB_NAME = 'MAZ_AuditoriaSensorialDB';
const DB_VERSION = 2;
const STORE_NAME = 'audits';
const META_KEY_LAST_SYNC = 'MAZ_AUDITORIA_LAST_SYNC';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      db.createObjectStore(STORE_NAME, { keyPath: 'DocId' });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Obtiene todos los registros guardados localmente en el navegador (0 lecturas a Firebase)
 */
export async function getCachedAudits(): Promise<AuditRecord[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        resolve([]);
      };
    });
  } catch (err) {
    console.warn('Error leyendo caché IndexedDB:', err);
    return [];
  }
}

/**
 * Guarda masivamente los registros en el almacenamiento local del navegador
 */
export async function saveCachedAudits(records: AuditRecord[]): Promise<void> {
  if (!records || records.length === 0) return;

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      store.clear();

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const docId = record.DocId || (record.FilaExcel ? `${record.ID}_F${record.FilaExcel}` : `${record.ID}_${i + 1}`);
        store.put({ ...record, DocId: docId });
      }

      transaction.oncomplete = () => {
        localStorage.setItem(META_KEY_LAST_SYNC, new Date().toISOString());
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    console.warn('Error guardando en caché IndexedDB:', err);
  }
}

/**
 * Inserta o actualiza registros individuales en la caché local sin borrar los existentes
 */
export async function mergeCachedAudits(newOrUpdated: AuditRecord[]): Promise<AuditRecord[]> {
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      for (let i = 0; i < newOrUpdated.length; i++) {
        const record = newOrUpdated[i];
        const docId = record.DocId || (record.FilaExcel ? `${record.ID}_F${record.FilaExcel}` : `${record.ID}_${i + 1}`);
        store.put({ ...record, DocId: docId });
      }

      transaction.oncomplete = () => {
        localStorage.setItem(META_KEY_LAST_SYNC, new Date().toISOString());
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
    });

    return await getCachedAudits();
  } catch (err) {
    console.warn('Error fusionando caché IndexedDB:', err);
    return [];
  }
}

export function getLastSyncTime(): string | null {
  return localStorage.getItem(META_KEY_LAST_SYNC);
}

export async function clearLocalCache(): Promise<void> {
  try {
    const db = await getDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    localStorage.removeItem(META_KEY_LAST_SYNC);
  } catch {
    // ignore
  }
}
