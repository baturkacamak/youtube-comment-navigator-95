import logger from '../../shared/utils/logger';
import { readYouTubeDataApiKeyFromStorage } from '../../shared/services/youtubeDataApi';
import type {
  MonitorCheckResult,
  MonitoredVideo,
  MonitorStatus,
  VideoCommentMonitorMetadata,
} from '../types';
import { diffNewComments, mergeSavedCommentSnapshots } from './commentMonitorDiff';
import {
  fetchLatestCommentsViaDataApi,
  fetchVideoCommentMonitorMetadata,
  fetchVideosCommentMonitorMetadata,
} from './youtubeDataApiMonitorFetch';

const MONITORED_VIDEOS_KEY = 'commentMonitorVideos';
const COMMENT_MONITOR_ALARM = 'ycn-comment-monitor';
const COMMENT_MONITOR_WAKE_INTERVAL_MINUTES = 15;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const VIDEO_METADATA_BATCH_SIZE = 50;

type MonitorMap = Record<string, MonitoredVideo>;

let listenersRegistered = false;

const readMonitors = async (): Promise<MonitorMap> => {
  const value = await chrome.storage.local.get(MONITORED_VIDEOS_KEY);
  return (value[MONITORED_VIDEOS_KEY] as MonitorMap | undefined) || {};
};

const writeMonitors = async (monitors: MonitorMap): Promise<void> => {
  await chrome.storage.local.set({ [MONITORED_VIDEOS_KEY]: monitors });
};

const readYouTubeDataApiKey = async (): Promise<string | null> => {
  return readYouTubeDataApiKeyFromStorage(chrome.storage.local);
};

const toSafeErrorContext = (error: unknown): Record<string, unknown> => ({
  errorName: error instanceof Error ? error.name : 'UnknownError',
  errorMessage: error instanceof Error ? error.message : 'Background comment monitoring failed.',
  status:
    typeof error === 'object' && error !== null && 'status' in error
      ? (error as { status?: unknown }).status
      : undefined,
  reason:
    typeof error === 'object' && error !== null && 'reason' in error
      ? (error as { reason?: unknown }).reason
      : undefined,
});

const toMonitorStatus = (monitor: MonitoredVideo | undefined): MonitorStatus => ({
  monitored: Boolean(monitor),
  lastCheckedAt: monitor?.lastCheckedAt ?? null,
  nextCheckAt: monitor?.nextCheckAt ?? null,
  intervalMinutes: monitor?.intervalMinutes ?? null,
  lastKnownCount: monitor?.lastKnownCount ?? 0,
  lastKnownTotalCommentCount: monitor?.lastKnownTotalCommentCount ?? null,
  lastError: monitor?.lastError ?? null,
});

export const getAdaptiveCommentMonitorIntervalMinutes = (
  publishedAt: string | null | undefined,
  enabledAt: number,
  now: number = Date.now()
): number => {
  const publishedTime = Date.parse(publishedAt || '');
  const ageStart = Number.isFinite(publishedTime) ? publishedTime : enabledAt;
  const age = Math.max(0, now - ageStart);

  if (age < DAY_MS) {
    return 15;
  }
  if (age < 7 * DAY_MS) {
    return 30;
  }
  if (age < 30 * DAY_MS) {
    return 180;
  }
  return 720;
};

const scheduleNextCheck = (
  monitor: MonitoredVideo,
  now: number,
  intervalMinutes = getAdaptiveCommentMonitorIntervalMinutes(
    monitor.publishedAt,
    monitor.enabledAt,
    now
  )
): MonitoredVideo => ({
  ...monitor,
  intervalMinutes,
  nextCheckAt: now + intervalMinutes * MINUTE_MS,
});

const getMonitorCommentCount = (monitor: MonitoredVideo): number | null =>
  monitor.lastKnownTotalCommentCount ?? null;

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const createNotification = async (
  videoId: string,
  title: string | null,
  newCount: number
): Promise<void> => {
  const notificationId = `comment-monitor:${videoId}`;
  const notificationTitle = title ? `New comments on ${title}` : 'New comments on a tracked video';
  const message = newCount === 1 ? '1 new comment detected.' : `${newCount} new comments detected.`;

  await chrome.notifications.create(notificationId, {
    type: 'basic',
    title: notificationTitle,
    message,
    iconUrl: chrome.runtime.getURL('icon128.png'),
  });
};

const openVideoFromNotification = async (notificationId: string): Promise<void> => {
  if (!notificationId.startsWith('comment-monitor:')) {
    return;
  }

  const videoId = notificationId.slice('comment-monitor:'.length);
  if (!videoId) {
    return;
  }

  await chrome.tabs.create({
    url: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
  });
  await chrome.notifications.clear(notificationId);
};

export const syncCommentMonitorAlarm = async (): Promise<void> => {
  const monitors = await readMonitors();
  if (Object.keys(monitors).length === 0) {
    await chrome.alarms.clear(COMMENT_MONITOR_ALARM);
    return;
  }

  await chrome.alarms.create(COMMENT_MONITOR_ALARM, {
    periodInMinutes: COMMENT_MONITOR_WAKE_INTERVAL_MINUTES,
  });
};

export const getVideoMonitorStatus = async (videoId: string): Promise<MonitorStatus> => {
  const monitors = await readMonitors();
  return toMonitorStatus(monitors[videoId]);
};

export const enableVideoCommentMonitoring = async (videoId: string): Promise<MonitorStatus> => {
  const monitors = await readMonitors();
  if (monitors[videoId]) {
    return toMonitorStatus(monitors[videoId]);
  }

  const key = await readYouTubeDataApiKey();
  if (!key) {
    return {
      monitored: false,
      lastCheckedAt: null,
      nextCheckAt: null,
      intervalMinutes: null,
      lastKnownCount: 0,
      lastKnownTotalCommentCount: null,
      lastError: 'Background monitoring requires a YouTube Data API key.',
    };
  }

  let baseline;
  try {
    baseline = await fetchLatestCommentsViaDataApi(videoId, key);
  } catch (error) {
    logger.error('Background comment monitor enable failed.', {
      operation: 'background-comment-monitor-enable',
      videoId,
      ...toSafeErrorContext(error),
    });
    throw error;
  }

  const now = Date.now();
  const intervalMinutes = getAdaptiveCommentMonitorIntervalMinutes(baseline.publishedAt, now, now);

  monitors[videoId] = {
    videoId,
    enabledAt: now,
    lastCheckedAt: now,
    nextCheckAt: now + intervalMinutes * MINUTE_MS,
    intervalMinutes,
    lastNotifiedAt: null,
    lastKnownCount: baseline.comments.length,
    lastKnownTotalCommentCount: baseline.totalCommentCount,
    lastSeenCommentIds: baseline.comments.map((comment) => comment.commentId).slice(0, 40),
    lastError: null,
    title: baseline.title,
    publishedAt: baseline.publishedAt,
    savedComments: [],
  };

  await writeMonitors(monitors);
  await syncCommentMonitorAlarm();
  return toMonitorStatus(monitors[videoId]);
};

export const disableVideoCommentMonitoring = async (videoId: string): Promise<MonitorStatus> => {
  const monitors = await readMonitors();
  delete monitors[videoId];
  await writeMonitors(monitors);
  await syncCommentMonitorAlarm();
  return toMonitorStatus(undefined);
};

export const checkVideoCommentMonitorNow = async (
  videoId: string,
  preloadedMetadata?: VideoCommentMonitorMetadata
): Promise<MonitorCheckResult> => {
  const monitors = await readMonitors();
  const monitor = monitors[videoId];

  if (!monitor) {
    return {
      ok: false,
      monitored: false,
      lastCheckedAt: null,
      nextCheckAt: null,
      intervalMinutes: null,
      lastKnownCount: 0,
      lastKnownTotalCommentCount: null,
      newCount: 0,
      error: 'This video is not being monitored.',
    };
  }

  try {
    const key = await readYouTubeDataApiKey();
    if (!key) {
      throw new Error('Background monitoring requires a YouTube Data API key.');
    }

    const metadata = preloadedMetadata || (await fetchVideoCommentMonitorMetadata(videoId, key));
    const lastCheckedAt = Date.now();
    const previousTotalCommentCount = getMonitorCommentCount(monitor);
    const nextTotalCommentCount = metadata.totalCommentCount;

    if (previousTotalCommentCount !== null && nextTotalCommentCount === previousTotalCommentCount) {
      const nextMonitor = scheduleNextCheck(
        {
          ...monitor,
          lastCheckedAt,
          lastError: null,
          title: metadata.title || monitor.title,
          publishedAt: metadata.publishedAt || monitor.publishedAt,
          lastKnownTotalCommentCount: nextTotalCommentCount,
        },
        lastCheckedAt
      );

      monitors[videoId] = nextMonitor;
      await writeMonitors(monitors);

      return {
        ok: true,
        monitored: true,
        lastCheckedAt,
        nextCheckAt: nextMonitor.nextCheckAt,
        intervalMinutes: nextMonitor.intervalMinutes,
        lastKnownCount: nextMonitor.lastKnownCount,
        lastKnownTotalCommentCount: nextMonitor.lastKnownTotalCommentCount,
        newCount: 0,
        skipped: true,
      };
    }

    const latest = await fetchLatestCommentsViaDataApi(videoId, key, undefined, metadata);
    const diff = diffNewComments(monitor.lastSeenCommentIds, latest.comments);

    const nextMonitor = scheduleNextCheck(
      {
        ...monitor,
        lastCheckedAt,
        lastKnownCount: latest.comments.length,
        lastKnownTotalCommentCount: latest.totalCommentCount,
        lastSeenCommentIds: diff.nextSeenCommentIds,
        lastError: null,
        title: latest.title || metadata.title || monitor.title,
        publishedAt: latest.publishedAt || metadata.publishedAt || monitor.publishedAt,
        savedComments: mergeSavedCommentSnapshots(monitor.savedComments, diff.newComments),
        lastNotifiedAt: diff.newComments.length > 0 ? lastCheckedAt : monitor.lastNotifiedAt,
      },
      lastCheckedAt
    );

    monitors[videoId] = nextMonitor;
    await writeMonitors(monitors);

    if (diff.newComments.length > 0) {
      await createNotification(videoId, nextMonitor.title, diff.newComments.length);
    }

    return {
      ok: true,
      monitored: true,
      lastCheckedAt,
      nextCheckAt: nextMonitor.nextCheckAt,
      intervalMinutes: nextMonitor.intervalMinutes,
      lastKnownCount: nextMonitor.lastKnownCount,
      lastKnownTotalCommentCount: nextMonitor.lastKnownTotalCommentCount,
      newCount: diff.newComments.length,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Background comment monitoring failed.';

    logger.error('Background comment monitor check failed.', {
      operation: 'background-comment-monitor-check',
      videoId,
      ...toSafeErrorContext(error),
      errorMessage,
    });

    const lastCheckedAt = Date.now();
    monitors[videoId] = scheduleNextCheck(
      {
        ...monitor,
        lastCheckedAt,
        lastError: errorMessage,
      },
      lastCheckedAt
    );
    await writeMonitors(monitors);

    return {
      ok: false,
      monitored: true,
      lastCheckedAt: monitors[videoId].lastCheckedAt,
      nextCheckAt: monitors[videoId].nextCheckAt,
      intervalMinutes: monitors[videoId].intervalMinutes,
      lastKnownCount: monitor.lastKnownCount,
      lastKnownTotalCommentCount: monitor.lastKnownTotalCommentCount,
      newCount: 0,
      error: errorMessage,
    };
  }
};

export const checkAllVideoCommentMonitors = async (): Promise<void> => {
  const monitors = await readMonitors();
  const now = Date.now();
  const dueVideoIds = Object.entries(monitors)
    .filter(([, monitor]) => !monitor.nextCheckAt || monitor.nextCheckAt <= now)
    .map(([videoId]) => videoId);

  if (dueVideoIds.length === 0) {
    return;
  }

  const key = await readYouTubeDataApiKey();
  if (!key) {
    for (const videoId of dueVideoIds) {
      await checkVideoCommentMonitorNow(videoId);
    }
    return;
  }

  for (const videoIdChunk of chunk(dueVideoIds, VIDEO_METADATA_BATCH_SIZE)) {
    let metadataByVideoId: Record<string, VideoCommentMonitorMetadata> = {};
    try {
      metadataByVideoId = await fetchVideosCommentMonitorMetadata(videoIdChunk, key);
    } catch (error) {
      logger.error('Background comment monitor metadata batch failed.', {
        operation: 'background-comment-monitor-metadata-batch',
        videoCount: videoIdChunk.length,
        ...toSafeErrorContext(error),
      });
    }

    for (const videoId of videoIdChunk) {
      await checkVideoCommentMonitorNow(videoId, metadataByVideoId[videoId]);
    }
  }
};

export const registerCommentMonitorListeners = (): void => {
  if (listenersRegistered) {
    return;
  }

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === COMMENT_MONITOR_ALARM) {
      void checkAllVideoCommentMonitors();
    }
  });

  chrome.notifications.onClicked.addListener((notificationId) => {
    void openVideoFromNotification(notificationId).catch((error) => {
      logger.error('Opening tracked video from notification failed.', {
        operation: 'background-comment-monitor-notification-click',
        notificationId,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : 'Unknown notification click error.',
      });
    });
  });

  listenersRegistered = true;
};
