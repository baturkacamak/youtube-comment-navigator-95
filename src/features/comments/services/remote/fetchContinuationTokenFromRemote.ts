import {ContentItem} from "../../../../types/commentTypes";
import {extractYouTubeVideoIdFromUrl} from "../../../shared/utils/extractYouTubeVideoIdFromUrl";
import { youtubeApi } from "../../../shared/services/youtubeApi";
import logger from '../../../shared/utils/logger';
import {
  clearContinuationToken,
  getContinuationToken,
  storeContinuationToken
} from './utils';

export const getContinuationTokenFromData = (data: any, isFetchingReply: boolean = false) => {
    try {
        const contents: ContentItem[] = data?.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];

        // Check the first path
        let continuationToken = contents
            .map((content: ContentItem) => content.itemSectionRenderer?.contents?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token)
            .find((token: string | undefined) => token);

        // If the first path doesn't have the continuation token, check the second path
        if (!continuationToken && !isFetchingReply) {
            continuationToken = contents
                .map((content: ContentItem) => content.itemSectionRenderer?.header?.[0]?.commentsHeaderRenderer?.sortMenu?.sortFilterSubMenuRenderer?.subMenuItems?.[0]?.serviceEndpoint?.continuationCommand?.token)
                .find((token: string | undefined) => token);
        }

        if (!continuationToken) {
            logger.error("Continuation data is null or undefined.");
            return null;
        }

        // Replace the 48th character 'A' with 'B'
        if (continuationToken.length >= 47 && continuationToken[46] === 'A') {
            continuationToken = continuationToken.slice(0, 47) + 'B' + continuationToken.slice(48);
        }

        return continuationToken;
    } catch (err) {
        if (err instanceof Error) {
            logger.error(`Error in fetchContinuationData: ${err.message}`, err);
        } else {
            logger.error(`Error in fetchContinuationData:`, err);
        }
        return null;
    }
};

export const fetchContinuationTokenFromRemote = async (videoId?: string): Promise<string> => {
    try {
        if (!videoId) {
            videoId = extractYouTubeVideoIdFromUrl();
        }
        
        // Use the new YouTube API service
        const result = await youtubeApi.fetchNext({
            videoId: videoId
        });

        return getContinuationTokenFromData(result) || '';
    } catch (error) {
        logger.error('Error fetching continuation token:', error);
        return '';
    }
};