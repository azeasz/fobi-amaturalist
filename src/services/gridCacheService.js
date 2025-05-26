const DB_NAME = 'GridCache';
const STORE_NAME = 'grids';
const DB_VERSION = 1;

class GridCacheService {
  constructor() {
    this.db = null;
    this.init();
  }

  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' });
        }
      };
    });
  }

  async setGridCache(markers, gridSize, grid) {
    const cacheKey = this.generateCacheKey(markers, gridSize);
    const transaction = this.db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.put({
        cacheKey,
        grid,
        timestamp: Date.now()
      });
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getGridCache(markers, gridSize) {
    const cacheKey = this.generateCacheKey(markers, gridSize);
    const transaction = this.db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.get(cacheKey);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        // Cache expires after 1 hour
        if (result && Date.now() - result.timestamp < 3600000) {
          resolve(result.grid);
        } else {
          resolve(null);
        }
      };
    });
  }

  generateCacheKey(markers, gridSize) {
    // Generate unique key based on markers and gridSize
    const markersHash = markers.map(m => `${m.id}-${m.source}`).join('');
    return `${markersHash}-${gridSize}`;
  }
}

export const gridCacheService = new GridCacheService(); 