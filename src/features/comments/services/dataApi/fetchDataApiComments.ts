import { Comment } from '../../../../types/commentTypes';
import { db } from '../../../shared/utils/database/database';
import logger from '../../../shared/utils/logger';

type DataApiRuntimeMessage = {
  type?: string;
  requestId?: string;
  comments?: Comment[];
  count?: number;
  quotaUsed?: number;
  done?: boolean;
  error?: string;
};

export async function fetchDataApiComments(
  videoId: string,
  onProgress?: (count: number, quota: number) => void
): Promise<void> {
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const listener = (message: DataApiRuntimeMessage) => {
      if (message?.requestId !== requestId) return;
      if (message.type === 'YCN_YT_API_CHUNK') {
        const comments = (message.comments || []) as Comment[];
        db.comments
          .bulkAdd(comments)
          .catch(async () => {
            await db.comments.bulkPut(comments);
          })
          .then(() => onProgress?.(message.count || 0, message.quotaUsed || 0));
        if (message.done) {
          chrome.runtime.onMessage.removeListener(listener);
          resolve();
        }
      }
      if (message.type === 'YCN_YT_API_ERROR') {
        chrome.runtime.onMessage.removeListener(listener);
        logger.error('YouTube Data API comment fetch failed in content script.', {
          operation: 'youtube-data-api-comment-fetch-content',
          videoId,
          errorCode: typeof message.error === 'string' ? message.error : 'unknown',
          count: typeof message.count === 'number' ? message.count : undefined,
          quotaUsed: typeof message.quotaUsed === 'number' ? message.quotaUsed : undefined,
        });
        reject(new Error(message.error || 'YouTube Data API request failed'));
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    chrome.runtime.sendMessage({ type: 'YCN_YT_API_FETCH', requestId, videoId }, (result) => {
      if (chrome.runtime.lastError || !result?.started) {
        const errorMessage =
          chrome.runtime.lastError?.message || 'Could not start YouTube Data API request';
        chrome.runtime.onMessage.removeListener(listener);
        logger.error('Could not start YouTube Data API comment fetch.', {
          operation: 'youtube-data-api-comment-fetch-start',
          videoId,
          errorMessage,
          started: Boolean(result?.started),
        });
        reject(new Error(errorMessage));
      }
    });
  });
}
