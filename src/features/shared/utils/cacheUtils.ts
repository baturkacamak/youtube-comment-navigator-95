const DEFAULT_CACHE_EXPIRATION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_DB_NAME = 'commentsCacheDB';
const DEFAULT_STORE_NAME = 'comments';

function openDatabaseConnection(dbName: string = DEFAULT_DB_NAME, storeName: string = DEFAULT_STORE_NAME): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: 'key' });
            }
        };
        request.onsuccess = (event: Event) => resolve((event.target as IDBOpenDBRequest).result);
        request.onerror = (event: Event) => reject((event.target as IDBOpenDBRequest).error);
    });
}

function getObjectStoreTransaction(db: IDBDatabase, storeName: string, mode: IDBTransactionMode): IDBObjectStore {
    return db.transaction(storeName, mode).objectStore(storeName);
}

export const retrieveDataFromDB = async (
    key: string,
    dbName: string = DEFAULT_DB_NAME,
    storeName: string = DEFAULT_STORE_NAME
): Promise<any> => {
    const db = await openDatabaseConnection(dbName, storeName);
    return new Promise((resolve, reject) => {
        const transaction = getObjectStoreTransaction(db, storeName, 'readonly');
        const request = transaction.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event: Event) => reject((event.target as IDBRequest).error);
    });
};

export const isCacheValid = (cachedData: any, cacheDuration: number = DEFAULT_CACHE_EXPIRATION_DURATION): boolean => {
    if (!cachedData) return false;
    const { timestamp } = cachedData;
    const now = Date.now();
    return (now - timestamp) < cacheDuration;
};

export const getCachedDataIfValid = async (
    key: string,
    cacheDuration: number = DEFAULT_CACHE_EXPIRATION_DURATION,
    dbName: string = DEFAULT_DB_NAME,
    storeName: string = DEFAULT_STORE_NAME
): Promise<any> => {
    const cachedData = await retrieveDataFromDB(key, dbName, storeName);
    if (isCacheValid(cachedData, cacheDuration)) {
        return cachedData.data;
    } else {
        await removeDataFromDB(key, dbName, storeName);  // Remove expired data
        return null;
    }
};

export const storeDataInDB = async (
    key: string,
    data: any,
    includeTimestamp: boolean = false,
    dbName: string = DEFAULT_DB_NAME,
    storeName: string = DEFAULT_STORE_NAME
): Promise<void> => {
    const db = await openDatabaseConnection(dbName, storeName);
    const dataEntry: any = {
        key,
        data
    };
    if (includeTimestamp) {
        dataEntry.timestamp = Date.now();
    }
    return new Promise((resolve, reject) => {
        const transaction = getObjectStoreTransaction(db, storeName, 'readwrite');
        const request = transaction.put(dataEntry);
        request.onsuccess = () => resolve();
        request.onerror = (event: Event) => reject((event.target as IDBRequest).error);
    });
};

export const removeDataFromDB = async (
    key: string,
    dbName: string = DEFAULT_DB_NAME,
    storeName: string = DEFAULT_STORE_NAME
): Promise<void> => {
    const db = await openDatabaseConnection(dbName, storeName);
    return new Promise((resolve, reject) => {
        const transaction = getObjectStoreTransaction(db, storeName, 'readwrite');
        const request = transaction.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = (event: Event) => reject((event.target as IDBRequest).error);
    });
};
