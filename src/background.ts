import { registerGeminiBackground } from '@baturkacamak/extension-ai-webextension';
import {
  checkVideoCommentMonitorNow,
  clearVideoCommentMonitorErrors,
  disableVideoCommentMonitoring,
  enableVideoCommentMonitoring,
  getVideoMonitorStatus,
  markVideoCommentMonitorsPausedForMissingKey,
  registerCommentMonitorListeners,
  syncCommentMonitorAlarm,
} from './features/comment-monitoring/services/commentMonitorService';
import { createGeminiStorageAdapter } from './features/intelligence/services/geminiStorage';
import {
  type DataApiCommentThreadsResponse,
  mapDataApiComment,
  readYouTubeDataApiKeyFromStorage,
  requestYouTubeDataApi,
  YOUTUBE_DATA_API_KEY_STORAGE,
} from './features/shared/services/youtubeDataApi';
import logger from './features/shared/utils/logger';

const aiBackgroundLogger = {
  error(message: string, context?: Record<string, unknown>) {
    console.error(`[YouTube Comment Navigator AI] ${message}`, context ?? {});
  },
};

const GEMINI_KEY = 'geminiApiKey';
const send = (tabId: number, message: unknown) =>
  chrome.tabs.sendMessage(tabId, message).catch(() => undefined);
const storageGet = async () => readYouTubeDataApiKeyFromStorage(chrome.storage.local);

const toSafeErrorContext = (error: unknown): Record<string, unknown> => ({
  errorName: error instanceof Error ? error.name : 'UnknownError',
  errorMessage: error instanceof Error ? error.message : 'YouTube Data API request failed.',
  status:
    typeof error === 'object' && error !== null && 'status' in error
      ? (error as { status?: unknown }).status
      : undefined,
  reason:
    typeof error === 'object' && error !== null && 'reason' in error
      ? (error as { reason?: unknown }).reason
      : undefined,
});

registerGeminiBackground(chrome.runtime, {
  storage: createGeminiStorageAdapter(chrome.storage.local),
  storageKey: GEMINI_KEY,
  namespace: 'YCN_AI',
  logger: aiBackgroundLogger,
});

registerCommentMonitorListeners();
void syncCommentMonitorAlarm();

async function fetchComments(tabId: number, requestId: string, videoId: string) {
  const key = await storageGet();
  if (!key) return send(tabId, { type: 'YCN_YT_API_ERROR', requestId, error: 'missingKey' });
  const controller = new AbortController();
  let quotaUsed = 0;
  let count = 0;
  let pageToken = '';
  try {
    do {
      const data = (await requestYouTubeDataApi(
        `/commentThreads?part=snippet,replies&videoId=${encodeURIComponent(videoId)}&maxResults=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`,
        key,
        controller.signal
      )) as DataApiCommentThreadsResponse;
      quotaUsed++;
      pageToken = data.nextPageToken || '';
      const comments = [];
      for (const thread of data.items || []) {
        const top = thread.snippet?.topLevelComment;
        if (!top) continue;
        comments.push(
          mapDataApiComment(
            { ...top.snippet, id: top.id },
            videoId,
            undefined,
            Number(thread.snippet?.totalReplyCount || 0)
          )
        );
        for (const reply of thread.replies?.comments || [])
          comments.push(mapDataApiComment({ ...reply.snippet, id: reply.id }, videoId, top.id));
      }
      count += comments.length;
      await send(tabId, {
        type: 'YCN_YT_API_CHUNK',
        requestId,
        comments,
        count,
        quotaUsed,
        done: !pageToken,
      });
    } while (pageToken);
  } catch (error: unknown) {
    logger.error('YouTube Data API comment fetch failed.', {
      operation: 'youtube-data-api-comment-fetch',
      videoId,
      count,
      quotaUsed,
      ...toSafeErrorContext(error),
    });
    await send(tabId, {
      type: 'YCN_YT_API_ERROR',
      requestId,
      error:
        typeof error === 'object' && error !== null && 'reason' in error
          ? (error as { reason?: string }).reason
          : error instanceof Error
            ? error.message
            : 'unknown',
      count,
      quotaUsed,
    });
  }
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type === 'YCN_YT_API_TEST') {
    (async () => {
      const key = typeof message.key === 'string' ? message.key.trim() : await storageGet();
      if (!key) return respond({ ok: false, error: 'Enter an API key first.' });
      try {
        await requestYouTubeDataApi(
          '/i18nLanguages?part=snippet&hl=en',
          key,
          new AbortController().signal
        );
        respond({ ok: true });
      } catch (error: unknown) {
        logger.error('YouTube Data API key test failed.', {
          operation: 'youtube-data-api-key-test',
          ...toSafeErrorContext(error),
        });
        respond({
          ok: false,
          error:
            typeof error === 'object' && error !== null && 'reason' in error
              ? (error as { reason?: string }).reason
              : error instanceof Error
                ? error.message
                : 'API key test failed.',
        });
      }
    })();
    return true;
  }
  if (message?.type === 'YCN_YT_API_STATUS') {
    storageGet().then((key) => respond({ configured: Boolean(key) }));
    return true;
  }
  if (message?.type === 'YCN_YT_API_KEY_SET') {
    (async () => {
      const key = message.key?.trim() || '';
      await chrome.storage.local.set({ [YOUTUBE_DATA_API_KEY_STORAGE]: key });
      if (key) {
        await clearVideoCommentMonitorErrors();
      } else {
        await markVideoCommentMonitorsPausedForMissingKey();
      }
      respond({ configured: Boolean(key) });
    })();
    return true;
  }
  if (message?.type === 'YCN_YT_API_FETCH' && sender.tab?.id) {
    void fetchComments(sender.tab.id, message.requestId, message.videoId);
    respond({ started: true });
    return true;
  }
  if (message?.type === 'YCN_COMMENT_MONITOR_STATUS' && typeof message.videoId === 'string') {
    getVideoMonitorStatus(message.videoId).then(respond);
    return true;
  }
  if (message?.type === 'YCN_COMMENT_MONITOR_ENABLE' && typeof message.videoId === 'string') {
    enableVideoCommentMonitoring(message.videoId).then(respond, (error: unknown) =>
      respond({
        monitored: false,
        apiKeyConfigured: false,
        lastCheckedAt: null,
        nextCheckAt: null,
        intervalMinutes: null,
        lastKnownCount: 0,
        lastKnownTotalCommentCount: null,
        lastError: error instanceof Error ? error.message : 'Could not enable monitoring.',
      })
    );
    return true;
  }
  if (message?.type === 'YCN_COMMENT_MONITOR_DISABLE' && typeof message.videoId === 'string') {
    disableVideoCommentMonitoring(message.videoId).then(respond);
    return true;
  }
  if (message?.type === 'YCN_COMMENT_MONITOR_CHECK_NOW' && typeof message.videoId === 'string') {
    checkVideoCommentMonitorNow(message.videoId).then(respond);
    return true;
  }
});
