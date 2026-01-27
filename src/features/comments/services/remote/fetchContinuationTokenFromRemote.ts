import { extractYouTubeVideoIdFromUrl } from '../../../shared/utils/extractYouTubeVideoIdFromUrl';
import { youtubeApi } from '../../../shared/services/youtubeApi';
import logger from '../../../shared/utils/logger';

// Helper to safely extract deep properties without crashing
const safeGet = (fn: () => any) => {
  try {
    return fn();
  } catch {
    return undefined;
  }
};

/**
 * Extracts the "Section Token" from the initial video details response.
 * This token identifies the comment section component within the video page.
 */
const extractSectionToken = (data: any): string | undefined => {
  try {
    const contents =
      safeGet(() => data?.contents?.twoColumnWatchNextResults?.results?.results?.contents) || [];

    // Strategy 1: Look for continuationItemRenderer in itemSectionRenderer
    const token = contents
      .map((content: any) =>
        safeGet(
          () =>
            content.itemSectionRenderer?.contents?.[0]?.continuationItemRenderer
              ?.continuationEndpoint?.continuationCommand?.token
        )
      )
      .find((t: string | undefined) => t);

    return token;
  } catch (e) {
    logger.error('[extractSectionToken] Failed to parse response:', e);
    return undefined;
  }
};

/**
 * Extracts the final "Comments Token" from the comment section response.
 * This token is used to actually fetch the list of comments.
 */
const extractCommentsToken = (data: any, sortOrderIndex: number = 0): string | undefined => {
  try {
    // The structure differs slightly when fetching the section directly.
    // Usually found in onResponseReceivedEndpoints

    const endpoints = data?.onResponseReceivedEndpoints || [];
    let token: string | undefined;

    // Strategy 1: Check onResponseReceivedEndpoints (typical for reload/continuation)
    for (const endpoint of endpoints) {
      const reloadContinuationItems = safeGet(
        () => endpoint.reloadContinuationItemsCommand?.continuationItems
      );
      const appendContinuationItems = safeGet(
        () => endpoint.appendContinuationItemsAction?.continuationItems
      );
      const items = reloadContinuationItems || appendContinuationItems || [];

      // Look for sortFilterSubMenuRenderer in header
      for (const item of items) {
        // Check deep path for sort menu
        const subMenuItems = safeGet(
          () => item.commentsHeaderRenderer?.sortMenu?.sortFilterSubMenuRenderer?.subMenuItems
        );
        if (subMenuItems && subMenuItems[sortOrderIndex]) {
          token = safeGet(
            () => subMenuItems[sortOrderIndex].serviceEndpoint?.continuationCommand?.token
          );
          if (token) return token;
        }

        // Also check generic continuation items
        if (item.continuationItemRenderer) {
          // Usually direct token is for "Show more", but in header context it might be meaningful
          // const directToken = safeGet(() => item.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token);
        }
      }
    }

    // Strategy 2: Fallback to the structure used in initial page load (if data comes from there)
    const contents =
      safeGet(() => data?.contents?.twoColumnWatchNextResults?.results?.results?.contents) || [];
    token = contents
      .map((content: any) =>
        safeGet(
          () =>
            content.itemSectionRenderer?.header?.[0]?.commentsHeaderRenderer?.sortMenu
              ?.sortFilterSubMenuRenderer?.subMenuItems?.[sortOrderIndex]?.serviceEndpoint
              ?.continuationCommand?.token
        )
      )
      .find((t: string | undefined) => t);

    return token;
  } catch (e) {
    logger.error('[extractCommentsToken] Failed to extract token:', e);
    return undefined;
  }
};

export const getContinuationTokenFromData = (
  data: any,
  _isFetchingReply: boolean = false
): string | null => {
  // This function is kept for backward compatibility or direct calls,
  // but ideally, the logic should be split as above.
  // For now, we delegate to the new extractors if it looks like a full page response.
  const sectionToken = extractSectionToken(data);
  if (sectionToken) return sectionToken;

  const commentsToken = extractCommentsToken(data);
  if (commentsToken) return commentsToken;

  return null;
};

export const fetchContinuationTokenFromRemote = async (videoId?: string): Promise<string> => {
  try {
    if (!videoId) {
      videoId = extractYouTubeVideoIdFromUrl();
    }
    logger.info(`[fetchContinuationTokenFromRemote] Starting for video: ${videoId}`);

    // --- Step 1: Fetch Video Details (Initial Page Data) ---
    const videoDetailsResponse = await youtubeApi.fetchNext({
      videoId: videoId,
    });

    logger.debug('[fetchContinuationTokenFromRemote] Step 1 response received.');

    // Attempt to find the "Comments Token" directly (rare, but possible on some layouts)
    let finalToken = extractCommentsToken(videoDetailsResponse, 1);
    if (finalToken) {
      logger.info('[fetchContinuationTokenFromRemote] Found comments token directly in Step 1.');
      return finalToken;
    }

    // --- Step 2: Find the "Section Token" to load the comment panel ---
    const sectionToken = extractSectionToken(videoDetailsResponse);

    if (!sectionToken) {
      logger.warn(
        '[fetchContinuationTokenFromRemote] Could not find Section Token in Step 1. Comments might be disabled or layout changed.'
      );
      return '';
    }

    logger.info(
      `[fetchContinuationTokenFromRemote] Found Section Token: ${sectionToken.substring(0, 20)}...`
    );

    // --- Step 3: Fetch the Comment Section ---
    const commentSectionResponse = await youtubeApi.fetchNext({
      continuationToken: sectionToken,
      videoId: videoId, // Pass videoId for context
    });

    logger.debug('[fetchContinuationTokenFromRemote] Step 3 response received.');

    // --- Step 4: Extract the actual "Comments Token" (continuation) ---
    // By default, we look for the "Top Comments" (index 0) or "Newest" (index 1) based on user pref.
    // For initialization, usually index 0 is fine.
    finalToken = extractCommentsToken(commentSectionResponse, 1);

    if (!finalToken) {
      logger.error(
        '[fetchContinuationTokenFromRemote] Failed to extract Final Comments Token from Step 3 response.'
      );
      return '';
    }

    logger.info(
      `[fetchContinuationTokenFromRemote] Successfully retrieved Final Token: ${finalToken.substring(0, 20)}...`
    );
    return finalToken;
  } catch (error) {
    logger.error('[fetchContinuationTokenFromRemote] Critical failure:', error);
    return '';
  }
};
