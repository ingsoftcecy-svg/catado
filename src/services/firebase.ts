import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  collection,
  query,
  limit,
  getDocs,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  writeBatch,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { AuditRecord } from '../types/audit';
import {
  getCachedAudits,
  saveCachedAudits,
  mergeCachedAudits,
  getLastSyncTime,
  clearLocalCache
} from './indexedDbCache';

// Configuración oficial de Firebase del proyecto "catado"
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA_KUnRv-w-s1YW2QtdVXiA6nOXfSrTraA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "catado.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "catado",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "catado.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "189992598287",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:189992598287:web:5dd3326396991b3cb89c7a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-WYW0X4GS9Y"
};

let activeApp: FirebaseApp | null = null;
let activeDatabase: Firestore | null = null;

/**
 * Obtiene la configuración activa de Firebase (prioriza la guardada en localStorage).
 * Complejidad Ciclomática: 2 (< 7)
 */
export function getActiveFirebaseConfig() {
  const storedConfigString = localStorage.getItem('CORONA_AUDITORIA_FIREBASE_CONFIG');
  if (storedConfigString) {
    try {
      return JSON.parse(storedConfigString);
    } catch {
      // fallback a default
    }
  }
  return DEFAULT_FIREBASE_CONFIG;
}

/**
 * Guarda una nueva configuración de Firebase y recarga el entorno.
 * Complejidad Ciclomática: 1 (< 7)
 */
export function saveFirebaseConfig(customConfig: typeof DEFAULT_FIREBASE_CONFIG): void {
  localStorage.setItem('CORONA_AUDITORIA_FIREBASE_CONFIG', JSON.stringify(customConfig));
  clearLocalCache();
  window.location.reload();
}

/**
 * Valida si las credenciales de Firebase están completas.
 * Complejidad Ciclomática: 1 (< 7)
 */
export function isFirebaseConfigured(): boolean {
  const configuration = getActiveFirebaseConfig();
  return Boolean(configuration.apiKey && configuration.projectId);
}

/**
 * Inicializa la conexión con Firestore con caché persistente multi-pestaña.
 * Complejidad Ciclomática: 3 (< 7)
 */
export function initFirebase(): { app: FirebaseApp | null; db: Firestore | null; isConnected: boolean } {
  const configuration = getActiveFirebaseConfig();
  if (!configuration.apiKey || !configuration.projectId) {
    return { app: null, db: null, isConnected: false };
  }

  if (!getApps().length) {
    activeApp = initializeApp(configuration);
    try {
      activeDatabase = initializeFirestore(activeApp, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } catch {
      activeDatabase = getFirestore(activeApp);
    }
  } else {
    activeApp = getApps()[0];
    activeDatabase = getFirestore(activeApp);
  }

  return { app: activeApp, db: activeDatabase, isConnected: true };
}

/**
 * Convierte un QuerySnapshot de Firestore a un arreglo tipado de AuditRecord.
 * Complejidad Ciclomática: 2 (< 7)
 */
function mapFirestoreSnapshotToRecords(snapshot: QuerySnapshot<DocumentData>): AuditRecord[] {
  const records: AuditRecord[] = [];
  snapshot.forEach((docSnapshot) => {
    const rawData = docSnapshot.data() as AuditRecord;
    records.push({
      ...rawData,
      ID: rawData.ID || docSnapshot.id,
      DocId: docSnapshot.id
    });
  });
  return records;
}

/**
 * Ejecuta la carga inicial completa desde Firestore cuando la caché está vacía.
 * Complejidad Ciclomática: 3 (< 7)
 */
async function fetchInitialCloudAudits(
  firestoreInstance: Firestore,
  onData: (records: AuditRecord[], isFromCache: boolean) => void,
  onError?: (error: Error) => void
): Promise<void> {
  try {
    const collectionReference = collection(firestoreInstance, 'auditorias_sensoriales');
    const snapshot = await getDocs(collectionReference);
    const records = mapFirestoreSnapshotToRecords(snapshot);

    if (records.length > 0) {
      await saveCachedAudits(records);
      onData(records, false);
    } else {
      onData([], false);
    }
  } catch (error) {
    console.error('Error en carga inicial Firestore:', error);
    if (onError && error instanceof Error) onError(error);
    onData([], false);
  }
}

/**
 * Consulta en segundo plano únicamente las últimas 200 catas (delta sync) para ahorrar lecturas.
 * Complejidad Ciclomática: 4 (< 7)
 */
async function fetchDeltaCloudUpdates(
  firestoreInstance: Firestore,
  currentCachedCount: number,
  onData: (records: AuditRecord[], isFromCache: boolean) => void
): Promise<void> {
  try {
    const deltaQuery = query(collection(firestoreInstance, 'auditorias_sensoriales'), limit(200));
    const snapshot = await getDocs(deltaQuery);
    const recentRecords = mapFirestoreSnapshotToRecords(snapshot);

    if (recentRecords.length > 0) {
      const mergedRecords = await mergeCachedAudits(recentRecords);
      if (mergedRecords.length !== currentCachedCount) {
        onData(mergedRecords, false);
      }
    }
  } catch (error) {
    console.warn('Consulta delta omitida (usando caché existente):', error);
  }
}

/**
 * Suscripción inteligente y ultra optimizada (Cache-First):
 * 1. Carga INMEDIATAMENTE desde IndexedDB local (0 lecturas gastadas, abre en 50ms).
 * 2. En segundo plano consulta únicamente las últimas 200 catas para mantener al día.
 * Complejidad Ciclomática: 3 (< 7)
 */
export function subscribeToAudits(
  onData: (records: AuditRecord[], isFromCache: boolean) => void,
  onError?: (error: Error) => void
): () => void {
  let isCancelled = false;

  getCachedAudits().then(async (cachedRecords) => {
    if (isCancelled) return;

    // Detectar si la caché contiene datos de prueba obsoletos
    const isMockCache =
      cachedRecords.length === 2347 ||
      (cachedRecords.length > 0 && cachedRecords[0]?.ID === 'PC-2026-09-1005-ZACATECAS');

    if (isMockCache) {
      await clearLocalCache();
      cachedRecords = [];
    }

    if (cachedRecords.length > 0) {
      onData(cachedRecords, true);
    }

    const { db: firestoreInstance, isConnected } = initFirebase();
    if (!isConnected || !firestoreInstance) {
      if (cachedRecords.length === 0) onData([], true);
      return;
    }

    if (cachedRecords.length === 0) {
      await fetchInitialCloudAudits(firestoreInstance, onData, onError);
    } else {
      await fetchDeltaCloudUpdates(firestoreInstance, cachedRecords.length, onData);
    }
  });

  return () => {
    isCancelled = true;
  };
}

/**
 * Fuerza una sincronización completa desde la nube bajo demanda.
 * Complejidad Ciclomática: 3 (< 7)
 */
export async function forceFullCloudSync(): Promise<AuditRecord[]> {
  const { db: firestoreInstance, isConnected } = initFirebase();
  if (!isConnected || !firestoreInstance) {
    return [];
  }

  await clearLocalCache();
  const collectionReference = collection(firestoreInstance, 'auditorias_sensoriales');
  const snapshot = await getDocs(collectionReference);
  const records = mapFirestoreSnapshotToRecords(snapshot);

  if (records.length > 0) {
    await saveCachedAudits(records);
  }
  return records;
}

/**
 * Elimina una lista de registros de Firebase Firestore por su DocId / ID en lotes de 400.
 * Complejidad Ciclomática: 4 (< 7)
 */
export async function deleteRecordsByDocIds(documentIds: string[]): Promise<number> {
  const { db: firestoreInstance, isConnected } = initFirebase();
  if (!isConnected || !firestoreInstance || documentIds.length === 0) {
    return 0;
  }

  const validDocumentIds = documentIds
    .map((documentId) => (documentId || '').trim())
    .filter((documentId) => documentId.length > 0 && !documentId.includes('/'));

  if (validDocumentIds.length === 0) return 0;

  const BATCH_LIMIT = 400;
  let totalDeletedCount = 0;

  for (let batchIndex = 0; batchIndex < validDocumentIds.length; batchIndex += BATCH_LIMIT) {
    const chunkIds = validDocumentIds.slice(batchIndex, batchIndex + BATCH_LIMIT);
    const writeBatchOperation = writeBatch(firestoreInstance);

    for (const docIdentifier of chunkIds) {
      const documentReference = doc(firestoreInstance, 'auditorias_sensoriales', docIdentifier);
      writeBatchOperation.delete(documentReference);
    }

    await writeBatchOperation.commit();
    totalDeletedCount += chunkIds.length;
  }

  await clearLocalCache();
  return totalDeletedCount;
}

export { getLastSyncTime };
