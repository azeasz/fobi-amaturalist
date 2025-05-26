import { openDB } from 'idb';

const DB_NAME = 'gridCache';
const STORE_NAME = 'grids';

export const initDB = async () => {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
  return db;
};

export const cacheGridData = async (key, data) => {
  const db = await initDB();
  await db.put(STORE_NAME, {
    id: key,
    data,
    timestamp: Date.now()
  });
};

export const getCachedGridData = async (key) => {
  const db = await initDB();
  const result = await db.get(STORE_NAME, key);
  
  // Cache valid selama 5 menit
  if (result && Date.now() - result.timestamp < 300000) {
    return result.data;
  }
  return null;
}; 