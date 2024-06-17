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

    test('should handle retrieval of non-existent data gracefully', async () => {
        const retrievedData = await retrieveDataFromDB('nonExistentKey', TEST_DB_NAME, TEST_STORE_NAME);
        expect(retrievedData).toBeNull();
    });

    test('should log error when failing to open database', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});

        const invalidDBName = '';
        try {
            await openDatabaseConnection(invalidDBName, TEST_STORE_NAME);
        } catch (error) {
            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to open database'), expect.anything());
        }

        (console.error as jest.Mock).mockRestore();
    });

    test('should log error when failing to store data', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});

        const invalidStoreName = '';
        try {
            await storeDataInDB(TEST_KEY, TEST_DATA, true, TEST_DB_NAME, invalidStoreName);
        } catch (error) {
            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to store data for key'), expect.anything());
        }

        (console.error as jest.Mock).mockRestore();
    });

    test('should log error when failing to retrieve data', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});

        const invalidStoreName = '';
        try {
            await retrieveDataFromDB(TEST_KEY, TEST_DB_NAME, invalidStoreName);
        } catch (error) {
            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to retrieve data for key'), expect.anything());
        }

        (console.error as jest.Mock).mockRestore();
    });

    test('should log error when failing to remove data', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});

        const invalidStoreName = '';
        try {
            await removeDataFromDB(TEST_KEY, TEST_DB_NAME, invalidStoreName);
        } catch (error) {
            expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to remove data for key'), expect.anything());
        }

        (console.error as jest.Mock).mockRestore();
    });
});
