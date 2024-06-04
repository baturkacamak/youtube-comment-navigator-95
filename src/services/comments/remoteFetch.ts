import {processCommentsData} from "../utils/utils";
import {fetchCommentData} from "./youtubeComments";
import {extractVideoId} from "../../utils/extractVideoId";
import {getValidCachedData, storeDataInCache} from "../../utils/cacheUtils";

import {CommentData} from "../../types/commentTypes";

const extractContinuationToken = (continuationItems: any[]) => {
    return continuationItems.map((continuationItem: any) =>
        continuationItem.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token
    ).find((token: string | undefined) => token);
};

const fetchReplies = async (comment: any, windowObj: any) => {
    const replies: any[] = [];
    const continuationItems = comment.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || [];

    for (const item of continuationItems) {
        let token = item?.commentThreadRenderer?.replies?.commentRepliesRenderer?.contents?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
        if (token) {
            token = token.replace(/(%3D%3D)+$/g, '');
            let replyData: CommentData;
            // do {
            //     replyData = await fetchCommentData(token, windowObj, null, true);
            //     replies.push(replyData);
            //     token = extractContinuationToken(replyData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems || []);
            // } while (token);
        }
    }
    return replies;
};

const CACHE_EXPIRATION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const fetchCommentsFromRemote = async (bypassCache = false) => {
    try {
        const videoId = extractVideoId();
        if (!videoId) {
            throw new Error('Video ID not found');
        }

        const LOCAL_STORAGE_KEY = `cachedComments_${videoId}`;
        if (!bypassCache) {
            const cachedData = await getValidCachedData(LOCAL_STORAGE_KEY);

            if (cachedData) {
                return cachedData;
            }
        }

        const windowObj = window as any; // Cast window to any to use in YouTube logic
        const allComments: CommentData[] = [];
        let token: string | undefined = '';

        do {
            const data: CommentData = await fetchCommentData(token, windowObj, null);
            allComments.push(data);

            const continuationItems = data.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems
                || data.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || [];
            token = extractContinuationToken(continuationItems);

            // Fetch replies for each comment
            for (const comment of allComments) {
                const replies = await fetchReplies(comment, windowObj);
                allComments.push(...replies);
            }

        } while (token);

        const processedData = processCommentsData(allComments);
        if (processedData.items.length > 0) {
            await storeDataInCache(LOCAL_STORAGE_KEY, processedData);
        }
        return processedData; // Process all fetched data
    } catch (error) {
        console.error('Error fetching comments from remote:', error);
        return {items: []};
    }
};