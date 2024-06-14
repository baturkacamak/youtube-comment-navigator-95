const CACHE_EXPIRATION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('commentsCacheDB', 1);
        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('comments')) {
                db.createObjectStore('comments', { keyPath: 'key' });
            }
        };
        request.onsuccess = (event: Event) => resolve((event.target as IDBOpenDBRequest).result);
        request.onerror = (event: Event) => reject((event.target as IDBOpenDBRequest).error);
    });
}

function getTransaction(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
    return db.transaction('comments', mode).objectStore('comments');
}

export const getValidCachedData = async (key: string): Promise<any> => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = getTransaction(db, 'readonly');
        const request = transaction.get(key);
        request.onsuccess = () => {
            const cachedData = request.result;
            if (cachedData) {
                const { data, timestamp } = cachedData;
                const now = Date.now();
                if (now - timestamp < CACHE_EXPIRATION_DURATION) {
                    resolve(data);
                } else {
                    removeDataFromCache(key);  // Remove expired data
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        };
        request.onerror = (event: Event) => reject((event.target as IDBRequest).error);
    });
};

export const storeDataInCache = async (key: string, data: any): Promise<void> => {
    const db = await openDatabase();
    const cacheEntry = {
        key,
        data,
        timestamp: Date.now()
    };
    return new Promise((resolve, reject) => {
        const transaction = getTransaction(db, 'readwrite');
        const request = transaction.put(cacheEntry);
        request.onsuccess = () => resolve();
        request.onerror = (event: Event) => reject((event.target as IDBRequest).error);
    });
};

export const removeDataFromCache = async (key: string): Promise<void> => {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = getTransaction(db, 'readwrite');
        const request = transaction.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = (event: Event) => reject((event.target as IDBRequest).error);
    });
};
