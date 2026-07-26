import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDataApiComments } from './fetchDataApiComments';
import logger from '../../../shared/utils/logger';

vi.mock('../../../shared/utils/database/database', () => ({
  db: {
    comments: {
      bulkAdd: vi.fn().mockResolvedValue(undefined),
      bulkPut: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock('../../../shared/utils/logger', () => ({
  default: {
    error: vi.fn(),
  },
}));

type RuntimeListener = (message: unknown) => void;
type RuntimeMock = {
  lastError: { message: string } | null;
  onMessage: {
    addListener: ReturnType<typeof vi.fn>;
    removeListener: ReturnType<typeof vi.fn>;
  };
  sendMessage: ReturnType<typeof vi.fn>;
};

describe('fetchDataApiComments', () => {
  let listener: RuntimeListener | undefined;
  let runtime: RuntimeMock;

  beforeEach(() => {
    listener = undefined;
    vi.clearAllMocks();
    vi.stubGlobal('crypto', { randomUUID: () => 'request-1' });
    runtime = {
      lastError: null,
      onMessage: {
        addListener: vi.fn((callback: RuntimeListener) => {
          listener = callback;
        }),
        removeListener: vi.fn(),
      },
      sendMessage: vi.fn((_message: unknown, callback: (result: unknown) => void) => {
        callback({ started: true });
      }),
    };
    vi.stubGlobal('chrome', { runtime });
  });

  it('logs background Data API errors before rejecting', async () => {
    const promise = fetchDataApiComments('video-1');

    listener?.({
      type: 'YCN_YT_API_ERROR',
      requestId: 'request-1',
      error: 'quotaExceeded',
      count: 12,
      quotaUsed: 3,
    });

    await expect(promise).rejects.toThrow('quotaExceeded');
    expect(logger.error).toHaveBeenCalledWith(
      'YouTube Data API comment fetch failed in content script.',
      {
        operation: 'youtube-data-api-comment-fetch-content',
        videoId: 'video-1',
        errorCode: 'quotaExceeded',
        count: 12,
        quotaUsed: 3,
      }
    );
  });

  it('logs when the Data API fetch cannot be started', async () => {
    runtime.sendMessage = vi.fn((_message: unknown, callback: (result: unknown) => void) => {
      runtime.lastError = { message: 'No receiving end' };
      callback({ started: false });
    });

    await expect(fetchDataApiComments('video-2')).rejects.toThrow('No receiving end');
    expect(logger.error).toHaveBeenCalledWith('Could not start YouTube Data API comment fetch.', {
      operation: 'youtube-data-api-comment-fetch-start',
      videoId: 'video-2',
      errorMessage: 'No receiving end',
      started: false,
    });
  });
});
