/**
 * I modelli 3D (.glb) sono troppo pesanti per un documento Firestore:
 * restano sul dispositivo, in IndexedDB.
 */
const DB = 'goaldrive';
const STORE = 'assets';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const assets = {
  get: (key: string) => run<Blob | undefined>('readonly', (s) => s.get(key) as IDBRequest<Blob | undefined>),
  set: (key: string, blob: Blob) => run('readwrite', (s) => s.put(blob, key) as IDBRequest<IDBValidKey>),
  del: (key: string) => run('readwrite', (s) => s.delete(key) as unknown as IDBRequest<undefined>),
};
