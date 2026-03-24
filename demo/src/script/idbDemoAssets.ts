const DB_NAME = 'particular-demo';
const STORE_NAME = 'assets';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }
  return dbPromise;
}

/** Single-key Blob storage in the demo `assets` object store. */
export interface BlobSlot {
  get(): Promise<Blob | undefined>;
  set(value: Blob): Promise<void>;
  clear(): Promise<void>;
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

export class DemoAssetsBlobSlot implements BlobSlot {
  constructor(private readonly recordKey: string) {}

  async get(): Promise<Blob | undefined> {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const result = await requestToPromise(tx.objectStore(STORE_NAME).get(this.recordKey));
    return result as Blob | undefined;
  }

  async set(value: Blob): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await requestToPromise(tx.objectStore(STORE_NAME).put(value, this.recordKey));
  }

  async clear(): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await requestToPromise(tx.objectStore(STORE_NAME).delete(this.recordKey));
  }
}
