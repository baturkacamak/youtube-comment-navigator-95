// indexedDB.test.ts

import {
    openDatabaseConnection,
    retrieveDataFromDB,
    storeDataInDB,
    removeDataFromDB,
    isCacheValid,
    getCachedDataIfValid,
    DEFAULT_CACHE_EXPIRATION_DURATION
} from './cacheUtils';

const TEST_DB_NAME = 'testDB';
const TEST_STORE_NAME = 'testStore';
const TEST_KEY = 'testKey';
const TEST_DATA = { example: 'data' };

beforeAll(async () => {
    // Ensure the test DB and store are created
    await openDatabaseConnection(TEST_DB_NAME, TEST_STORE_NAME);
});

afterAll(async () => {
    // Clean up after tests
    const db = await openDatabaseConnection(TEST_DB_NAME, TEST_STORE_NAME);
    db.close();
    indexedDB.deleteDatabase(TEST_DB_NAME);
});

describe('IndexedDB Utility Functions', () => {
    test('should store and retrieve data from IndexedDB', async () => {
        await storeDataInDB(TEST_KEY, TEST_DATA, true, TEST_DB_NAME, TEST_STORE_NAME);
        const retrievedData = await retrieveDataFromDB(TEST_KEY, TEST_DB_NAME, TEST_STORE_NAME);
        expect(retrievedData).toEqual(TEST_DATA);
    });

    test('should remove data from IndexedDB', async () => {
        await storeDataInDB(TEST_KEY, TEST_DATA, true, TEST_DB_NAME, TEST_STORE_NAME);
        await removeDataFromDB(TEST_KEY, TEST_DB_NAME, TEST_STORE_NAME);
        const retrievedData = await retrieveDataFromDB(TEST_KEY, TEST_DB_NAME, TEST_STORE_NAME);
        expect(retrievedData).toBeNull();
    });

    test('should validate cache correctly', () => {
        const validData = { data: TEST_DATA, timestamp: Date.now() };
        const invalidData = { data: TEST_DATA, timestamp: Date.now() - (25 * 60 * 60 * 1000) }; // 25 hours old

        expect(isCacheValid(validData)).toBe(true);
        expect(isCacheValid(invalidData)).toBe(false);
    });

    test('should retrieve valid cached data', async () => {
        await storeDataInDB(TEST_KEY, TEST_DATA, true, TEST_DB_NAME, TEST_STORE_NAME);
        const cachedData = await getCachedDataIfValid(TEST_KEY, DEFAULT_CACHE_EXPIRATION_DURATION, TEST_DB_NAME, TEST_STORE_NAME);
        expect(cachedData).toEqual(TEST_DATA);
    });

    test('should remove expired cached data', async () => {
        const expiredData = { data: TEST_DATA, timestamp: Date.now() - (25 * 60 * 60 * 1000) }; // 25 hours old
        await storeDataInDB(TEST_KEY, expiredData, false, TEST_DB_NAME, TEST_STORE_NAME);

        const cachedData = await getCachedDataIfValid(TEST_KEY, DEFAULT_CACHE_EXPIRATION_DURATION, TEST_DB_NAME, TEST_STORE_NAME);
        expect(cachedData).toBeNull();
    });
});
