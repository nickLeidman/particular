const DB_NAME = 'particular-demo';
const STORE_NAME = 'assets';
const CUSTOM_OBJECT_KEY = 'custom-object';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
  });
}

export function getCustomObject(): Promise<Blob | undefined> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(CUSTOM_OBJECT_KEY);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          db.close();
          resolve(req.result as Blob | undefined);
        };
      }),
  );
}

export function setCustomObject(blob: Blob): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).put(blob, CUSTOM_OBJECT_KEY);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          db.close();
          resolve();
        };
      }),
  );
}

export function clearCustomObject(): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).delete(CUSTOM_OBJECT_KEY);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          db.close();
          resolve();
        };
      }),
  );
}
