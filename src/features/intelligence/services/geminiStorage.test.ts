import { createGeminiStorageAdapter } from './geminiStorage';

describe('createGeminiStorageAdapter', () => {
  it('removes a legacy configured marker instead of using it as an API key', async () => {
    const storage = {
      get: vi.fn().mockResolvedValue({ geminiApiKey: 'configured' }),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const adapter = createGeminiStorageAdapter(storage);

    await expect(adapter.get('geminiApiKey')).resolves.toEqual({ geminiApiKey: '' });
    expect(storage.remove).toHaveBeenCalledWith('geminiApiKey');
  });

  it('preserves a real extension-storage API key', async () => {
    const storage = {
      get: vi.fn().mockResolvedValue({ geminiApiKey: 'real-api-key' }),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    const adapter = createGeminiStorageAdapter(storage);

    await expect(adapter.get('geminiApiKey')).resolves.toEqual({
      geminiApiKey: 'real-api-key',
    });
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
