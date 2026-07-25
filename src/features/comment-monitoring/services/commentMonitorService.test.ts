import type {
  BackgroundCommentFetchResult,
  MonitoredVideo,
  VideoCommentMonitorMetadata,
} from '../types';
import {
  checkAllVideoCommentMonitors,
  checkVideoCommentMonitorNow,
  clearVideoCommentMonitorErrors,
  disableVideoCommentMonitoring,
  enableVideoCommentMonitoring,
  getAdaptiveCommentMonitorIntervalMinutes,
  getVideoMonitorStatus,
  markVideoCommentMonitorsPausedForMissingKey,
} from './commentMonitorService';

const {
  fetchLatestCommentsViaDataApiMock,
  fetchVideoCommentMonitorMetadataMock,
  fetchVideosCommentMonitorMetadataMock,
  loggerErrorMock,
} = vi.hoisted(() => ({
  fetchLatestCommentsViaDataApiMock: vi.fn(),
  fetchVideoCommentMonitorMetadataMock: vi.fn(),
  fetchVideosCommentMonitorMetadataMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock('./youtubeDataApiMonitorFetch', () => ({
  fetchLatestCommentsViaDataApi: fetchLatestCommentsViaDataApiMock,
  fetchVideoCommentMonitorMetadata: fetchVideoCommentMonitorMetadataMock,
  fetchVideosCommentMonitorMetadata: fetchVideosCommentMonitorMetadataMock,
}));

vi.mock('../../shared/utils/logger', () => ({
  default: { error: loggerErrorMock },
}));

const VIDEO_ID = 'video-1';
const STORAGE_KEY = 'youtubeDataApiKey';
const MONITORS_KEY = 'commentMonitorVideos';
const MISSING_KEY = 'Background monitoring requires a YouTube Data API key.';

const createStorageMock = () => {
  let data: Record<string, unknown> = {};

  return {
    get data() {
      return data;
    },
    set data(nextData: Record<string, unknown>) {
      data = nextData;
    },
    api: {
      get: vi.fn(async (keys?: string | string[]) => {
        if (!keys) {
          return { ...data };
        }
        if (typeof keys === 'string') {
          return { [keys]: data[keys] };
        }
        return Object.fromEntries(keys.map((key) => [key, data[key]]));
      }),
      set: vi.fn(async (values: Record<string, unknown>) => {
        data = { ...data, ...values };
      }),
      clear: vi.fn(async () => {
        data = {};
      }),
    },
  };
};

const storage = createStorageMock();

const setChromeMock = () => {
  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      local: storage.api,
    },
    alarms: {
      clear: vi.fn(async () => true),
      create: vi.fn(async () => undefined),
      onAlarm: { addListener: vi.fn() },
    },
    notifications: {
      create: vi.fn(async () => 'notification-id'),
      clear: vi.fn(async () => true),
      onClicked: { addListener: vi.fn() },
    },
    runtime: {
      getURL: (path: string) => `chrome-extension://test/${path}`,
    },
    tabs: {
      create: vi.fn(async () => undefined),
    },
  };
};

const comment = (commentId: string, publishedDate: number) => ({
  author: 'Author',
  likes: 0,
  viewLikes: '',
  content: `Comment ${commentId}`,
  published: new Date(publishedDate).toISOString(),
  publishedDate,
  authorAvatarUrl: '',
  isAuthorContentCreator: false,
  authorChannelId: '',
  replyCount: 0,
  commentId,
  commentParentId: '',
  replyLevel: 0,
  hasTimestamp: false,
  hasLinks: false,
  videoId: VIDEO_ID,
  wordCount: 2,
  timestamp: publishedDate,
  source: 'dataApi' as const,
});

const baseline: BackgroundCommentFetchResult = {
  comments: [comment('c2', 200), comment('c1', 100)],
  title: 'Video title',
  publishedAt: '2026-01-30T12:00:00Z',
  totalCommentCount: 2,
};

const metadata = (totalCommentCount: number): VideoCommentMonitorMetadata => ({
  title: 'Video title',
  publishedAt: '2026-01-30T12:00:00Z',
  totalCommentCount,
});

const getMonitor = (): MonitoredVideo | undefined =>
  (storage.data[MONITORS_KEY] as Record<string, MonitoredVideo> | undefined)?.[VIDEO_ID];

describe('commentMonitorService', () => {
  const now = Date.parse('2026-01-31T00:00:00Z');

  beforeEach(() => {
    vi.clearAllMocks();
    storage.data = {};
    setChromeMock();
    fetchLatestCommentsViaDataApiMock.mockResolvedValue(baseline);
    fetchVideoCommentMonitorMetadataMock.mockResolvedValue(metadata(2));
    fetchVideosCommentMonitorMetadataMock.mockResolvedValue({ [VIDEO_ID]: metadata(2) });
  });

  it('uses a 15 minute interval during the first day after publication', () => {
    expect(
      getAdaptiveCommentMonitorIntervalMinutes(
        '2026-01-30T12:00:00Z',
        now - 12 * 60 * 60 * 1000,
        now
      )
    ).toBe(15);
  });

  it('uses a 30 minute interval during the first week after publication', () => {
    expect(getAdaptiveCommentMonitorIntervalMinutes('2026-01-28T00:00:00Z', now, now)).toBe(30);
  });

  it('uses a 3 hour interval during the first month after publication', () => {
    expect(getAdaptiveCommentMonitorIntervalMinutes('2026-01-15T00:00:00Z', now, now)).toBe(180);
  });

  it('uses a 12 hour interval for older videos', () => {
    expect(getAdaptiveCommentMonitorIntervalMinutes('2025-12-01T00:00:00Z', now, now)).toBe(720);
  });

  it('falls back to tracking age when publication date is unavailable', () => {
    expect(getAdaptiveCommentMonitorIntervalMinutes(null, now - 2 * 60 * 60 * 1000, now)).toBe(15);
  });

  it('keeps the no-key/no-monitor state inert and does not create a monitor', async () => {
    await expect(getVideoMonitorStatus(VIDEO_ID)).resolves.toMatchObject({
      monitored: false,
      apiKeyConfigured: false,
      lastError: null,
    });

    await expect(enableVideoCommentMonitoring(VIDEO_ID)).resolves.toMatchObject({
      monitored: false,
      apiKeyConfigured: false,
      lastError: MISSING_KEY,
    });
    expect(getMonitor()).toBeUndefined();
    expect(fetchLatestCommentsViaDataApiMock).not.toHaveBeenCalled();
  });

  it('creates an active monitor when a key exists and then disables it cleanly', async () => {
    await storage.api.set({ [STORAGE_KEY]: 'valid-key' });

    await expect(enableVideoCommentMonitoring(VIDEO_ID)).resolves.toMatchObject({
      monitored: true,
      apiKeyConfigured: true,
      lastError: null,
      lastKnownCount: 2,
      lastKnownTotalCommentCount: 2,
    });
    expect(getMonitor()?.lastSeenCommentIds).toEqual(['c2', 'c1']);

    await expect(disableVideoCommentMonitoring(VIDEO_ID)).resolves.toMatchObject({
      monitored: false,
      apiKeyConfigured: true,
    });
    expect(getMonitor()).toBeUndefined();
  });

  it('preserves a followed video as paused when the key is removed and resumes after restore', async () => {
    await storage.api.set({ [STORAGE_KEY]: 'valid-key' });
    await enableVideoCommentMonitoring(VIDEO_ID);

    await storage.api.set({ [STORAGE_KEY]: '' });
    await markVideoCommentMonitorsPausedForMissingKey();

    await expect(getVideoMonitorStatus(VIDEO_ID)).resolves.toMatchObject({
      monitored: true,
      apiKeyConfigured: false,
      lastError: MISSING_KEY,
    });
    await expect(checkVideoCommentMonitorNow(VIDEO_ID)).resolves.toMatchObject({
      ok: false,
      monitored: true,
      apiKeyConfigured: false,
      error: MISSING_KEY,
    });
    expect(fetchVideoCommentMonitorMetadataMock).not.toHaveBeenCalled();

    await storage.api.set({ [STORAGE_KEY]: 'rotated-key' });
    await clearVideoCommentMonitorErrors();

    await expect(getVideoMonitorStatus(VIDEO_ID)).resolves.toMatchObject({
      monitored: true,
      apiKeyConfigured: true,
      lastError: null,
    });
  });

  it('skips the full comment fetch when the Data API comment count is unchanged', async () => {
    await storage.api.set({ [STORAGE_KEY]: 'valid-key' });
    await enableVideoCommentMonitoring(VIDEO_ID);
    fetchLatestCommentsViaDataApiMock.mockClear();

    await expect(checkVideoCommentMonitorNow(VIDEO_ID)).resolves.toMatchObject({
      ok: true,
      monitored: true,
      apiKeyConfigured: true,
      skipped: true,
      newCount: 0,
    });
    expect(fetchVideoCommentMonitorMetadataMock).toHaveBeenCalledWith(VIDEO_ID, 'valid-key');
    expect(fetchLatestCommentsViaDataApiMock).not.toHaveBeenCalled();
  });

  it('fetches comments, saves new snapshots and notifies when the comment count changes', async () => {
    await storage.api.set({ [STORAGE_KEY]: 'valid-key' });
    await enableVideoCommentMonitoring(VIDEO_ID);
    fetchVideoCommentMonitorMetadataMock.mockResolvedValue(metadata(3));
    fetchLatestCommentsViaDataApiMock.mockResolvedValue({
      ...baseline,
      comments: [comment('c3', 300), ...baseline.comments],
      totalCommentCount: 3,
    });

    await expect(checkVideoCommentMonitorNow(VIDEO_ID)).resolves.toMatchObject({
      ok: true,
      newCount: 1,
      lastKnownTotalCommentCount: 3,
    });
    expect(getMonitor()?.savedComments.map((saved) => saved.commentId)).toEqual(['c3']);
    expect(chrome.notifications.create).toHaveBeenCalledWith(
      `comment-monitor:${VIDEO_ID}`,
      expect.objectContaining({ message: '1 new comment detected.' })
    );
  });

  it('stores invalid-key API failures without deleting the followed video and clears them after key rotation', async () => {
    await storage.api.set({ [STORAGE_KEY]: 'valid-key' });
    await enableVideoCommentMonitoring(VIDEO_ID);
    fetchVideoCommentMonitorMetadataMock.mockRejectedValue(
      Object.assign(new Error('API key not valid. Please pass a valid API key.'), {
        status: 400,
        reason: 'badRequest',
      })
    );

    await expect(checkVideoCommentMonitorNow(VIDEO_ID)).resolves.toMatchObject({
      ok: false,
      monitored: true,
      apiKeyConfigured: true,
      error: 'API key not valid. Please pass a valid API key.',
    });
    expect(getMonitor()?.lastError).toBe('API key not valid. Please pass a valid API key.');
    expect(loggerErrorMock).toHaveBeenCalledWith(
      'Background comment monitor check failed.',
      expect.objectContaining({ status: 400, reason: 'badRequest' })
    );

    await clearVideoCommentMonitorErrors();
    expect(getMonitor()?.lastError).toBeNull();
  });

  it('does not log errors or call Data API when due monitors exist but the key is missing', async () => {
    await storage.api.set({ [STORAGE_KEY]: 'valid-key' });
    await enableVideoCommentMonitoring(VIDEO_ID);
    await storage.api.set({ [STORAGE_KEY]: '' });
    const monitor = getMonitor();
    storage.data = {
      ...storage.data,
      [MONITORS_KEY]: {
        [VIDEO_ID]: {
          ...monitor,
          nextCheckAt: Date.now() - 1,
        },
      },
    };

    await checkAllVideoCommentMonitors();

    expect(fetchVideosCommentMonitorMetadataMock).not.toHaveBeenCalled();
    expect(fetchVideoCommentMonitorMetadataMock).not.toHaveBeenCalled();
    expect(loggerErrorMock).not.toHaveBeenCalled();
  });
});
