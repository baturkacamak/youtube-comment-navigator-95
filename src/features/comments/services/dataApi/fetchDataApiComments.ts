import { Comment } from '../../../../types/commentTypes';
import { db } from '../../../shared/utils/database/database';

export async function fetchDataApiComments(
  videoId: string,
  onProgress?: (count: number, quota: number) => void
): Promise<void> {
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const listener = (message: any) => {
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
        reject(new Error(message.error || 'YouTube Data API request failed'));
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    chrome.runtime.sendMessage({ type: 'YCN_YT_API_FETCH', requestId, videoId }, (result) => {
      if (chrome.runtime.lastError || !result?.started) {
        chrome.runtime.onMessage.removeListener(listener);
        reject(
          new Error(chrome.runtime.lastError?.message || 'Could not start YouTube Data API request')
        );
      }
    });
  });
}
