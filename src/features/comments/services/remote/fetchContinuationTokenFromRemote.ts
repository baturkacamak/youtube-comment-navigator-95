import { extractYouTubeVideoIdFromUrl } from '../../../shared/utils/extractYouTubeVideoIdFromUrl';
import { youtubeApi } from '../../../shared/services/youtubeApi';
import {
  extractCommentsToken,
  extractSectionToken,
  getContinuationTokenFromData,
} from './commentContinuationTokens';

export const fetchContinuationTokenFromRemote = async (videoId?: string): Promise<string> => {
  try {
    if (!videoId) {
      videoId = extractYouTubeVideoIdFromUrl();
    }

    // --- Step 1: Fetch Video Details (Initial Page Data) ---
    const videoDetailsResponse = await youtubeApi.fetchNext({
      videoId: videoId,
    });

    // Attempt to find the "Comments Token" directly (rare, but possible on some layouts)
    let finalToken = extractCommentsToken(videoDetailsResponse, 1);
    if (finalToken) {
      return finalToken;
    }

    // --- Step 2: Find the "Section Token" to load the comment panel ---
    const sectionToken = extractSectionToken(videoDetailsResponse);

    if (!sectionToken) {
      return '';
    }

    // --- Step 3: Fetch the Comment Section ---
    const commentSectionResponse = await youtubeApi.fetchNext({
      continuationToken: sectionToken,
      videoId: videoId, // Pass videoId for context
    });

    // --- Step 4: Extract the actual "Comments Token" (continuation) ---
    // By default, we look for the "Top Comments" (index 0) or "Newest" (index 1) based on user pref.
    // For initialization, usually index 0 is fine.
    finalToken = extractCommentsToken(commentSectionResponse, 1);

    if (!finalToken) {
      return '';
    }

    return finalToken;
  } catch (error) {
    return '';
  }
};

export { getContinuationTokenFromData };
