import type { StorageAreaLike } from '@baturkacamak/extension-ai-webextension';

const INVALID_LEGACY_MARKER = 'configured';

/**
 * Prevents the old page-storage marker from ever being treated as a Gemini API key.
 * Reading the invalid marker also removes it from privileged extension storage.
 */
export const createGeminiStorageAdapter = (storage: StorageAreaLike): StorageAreaLike => ({
  async get(key) {
    const values = await storage.get(key);
    if (values[key] !== INVALID_LEGACY_MARKER) return values;

    if (storage.remove) await storage.remove(key);
    else await storage.set({ [key]: '' });
    return { ...values, [key]: '' };
  },
  set(items) {
    return storage.set(items);
  },
  remove(key) {
    return storage.remove ? storage.remove(key) : storage.set({ [key]: '' });
  },
});
