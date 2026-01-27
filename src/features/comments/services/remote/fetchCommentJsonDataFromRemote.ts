import {
  fetchContinuationTokenFromRemote,
  getContinuationTokenFromData,
} from './fetchContinuationTokenFromRemote';
import { youtubeApi } from '../../../shared/services/youtubeApi';
import logger from '../../../shared/utils/logger';

/**
 * Gets the continuation token either from the provided token, the window object, or by fetching from remote
 */
const getContinuationToken = async (
  continueToken: string | null,
  windowObj: any,
  isFetchingReply: boolean
): Promise<string> => {
  if (continueToken) {
    return continueToken;
  }

  let continuation = getContinuationTokenFromData(windowObj.ytInitialData, isFetchingReply);

  if (!continuation) {
    continuation = await fetchContinuationTokenFromRemote();
  }

  return continuation;
};

/**
 * Fetches comment JSON data from the YouTube API using the continuation token
 */
export const fetchCommentJsonDataFromRemote = async (
  continueToken: string | null,
  windowObj: any,
  signal?: AbortSignal
) => {
  try {
    const continuation = await getContinuationToken(continueToken, windowObj, signal !== undefined);

    // Use the new YouTube API service
    return await youtubeApi.fetchNext({
      continuationToken: continuation,
      isFetchingReply: signal !== undefined,
      signal,
    });
  } catch (error) {
    logger.error('Error fetching comments:', error);
    return [];
  }
};
