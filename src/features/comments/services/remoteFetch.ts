import {fetchCommentJsonDataFromRemote} from "./fetchCommentJsonDataFromRemote";
import {extractYouTubeVideoIdFromUrl} from "../../shared/utils/extractYouTubeVideoIdFromUrl";
import {getCachedDataIfValid, removeDataFromDB, storeDataInDB} from "../../shared/utils/cacheUtils";
import {CommentData} from "../../../types/commentTypes";
import {CACHE_KEYS} from "../../shared/utils/environmentVariables";
import {processRawJsonCommentsData} from "../utils/comments/retrieveYouTubeCommentPaths";

const extractContinuationToken = (continuationItems: any[]): string | null => {
    if (!continuationItems || continuationItems.length === 0) {
        return null;
    }
    const lastItem = continuationItems[continuationItems.length - 1];
    return lastItem?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token || null;
};

const extractReplyContinuationTokens = (continuationItems: any[]): string[] | null => {
    if (!continuationItems || continuationItems.length === 0) {
        return null;
    }
    const tokens = continuationItems.map((continuationItem: any) =>
        continuationItem.commentThreadRenderer?.replies?.commentRepliesRenderer?.contents?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token ||
        continuationItem?.continuationItemRenderer?.button?.buttonRenderer?.command?.continuationCommand?.token
    ).filter((token: string | undefined) => token !== undefined) as string[];
    return tokens.length > 0 ? tokens : null;
};

const fetchReplies = async (rawJsonData: any, windowObj: any) => {
    const replies: any[] = [];
    const fetchRepliesRecursively = async (token: string) => {
        const replyData = await fetchCommentJsonDataFromRemote(token, windowObj, null);
        replies.push(replyData);
        const continuationItems = replyData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems
            || replyData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || [];
        const newTokens = extractReplyContinuationTokens(continuationItems);
        if (Array.isArray(newTokens) && newTokens.length > 0) {
            await Promise.all(newTokens.map(token => fetchRepliesRecursively(token)));
        }
    };
    const continuationItems = rawJsonData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems
        || rawJsonData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || [];
    const tokens = extractReplyContinuationTokens(continuationItems);
    if (Array.isArray(tokens) && tokens.length > 0) {
        await Promise.all(tokens.map(token => fetchRepliesRecursively(token)));
    }
    return replies;
};

export const fetchCommentsFromRemote = async (
    onCommentsFetched: (comments: any[]) => void,
    signal?: AbortSignal,
    bypassCache: boolean = false,
    continuationToken?: string
) => {
    try {
        const videoId = extractYouTubeVideoIdFromUrl();
        if (!videoId) {
            throw new Error('Video ID not found');
        }

        const LOCAL_STORAGE_KEY = CACHE_KEYS.FINAL(videoId);
        const TEMP_CACHE_KEY = CACHE_KEYS.TEMP(videoId);
        const CONTINUATION_TOKEN_KEY = CACHE_KEYS.CONTINUATION_TOKEN(videoId);
        const cachedData = await getCachedDataIfValid(LOCAL_STORAGE_KEY);

        if (!bypassCache && cachedData) {
            onCommentsFetched(cachedData?.items || cachedData);
            return;
        }

        let allComments: CommentData[] = [];
        let processedData: { items: any[] } = { items: [] };
        const windowObj = window as any; // Cast window to any to use in YouTube logic
        let token: string | null = continuationToken || null;
        let totalComments: CommentData[] = [];
        const batchSize = 500;
        const updateThreshold = 2500;
        let accumulatedComments: any[] = [];
        let totalFetched = 0;

        do {
            if (signal?.aborted) {
                return;
            }

            // Reset allComments and processedData at the start of each iteration
            allComments = [];
            processedData = { items: [] };

            const rawJsonData: CommentData = await fetchCommentJsonDataFromRemote(token, windowObj, null);
            allComments.push(rawJsonData);

            // Fetch replies for each comment
            const replies = await fetchReplies(rawJsonData, windowObj);
            allComments.push(...replies);

            processedData = processRawJsonCommentsData(allComments);
            accumulatedComments.push(...processedData.items);

            if (totalFetched >= updateThreshold && accumulatedComments.length >= batchSize) {
                onCommentsFetched(accumulatedComments);
                totalComments.push(...accumulatedComments);
                accumulatedComments = [];
            } else if (totalFetched <= updateThreshold) {
                onCommentsFetched(accumulatedComments);
                totalComments.push(...accumulatedComments);
                accumulatedComments = [];
            }

            totalFetched += processedData.items.length;
            const continuationItems = rawJsonData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems
                || rawJsonData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || [];
            token = extractContinuationToken(continuationItems);

        } while (token);

        if (accumulatedComments.length > 0) {
            onCommentsFetched(accumulatedComments);
            totalComments.push(...accumulatedComments);
        }

        await storeDataInDB(LOCAL_STORAGE_KEY, totalComments, true);

        // Clear temporary cache and continuation token
        await removeDataFromDB(TEMP_CACHE_KEY);
        localStorage.removeItem(CONTINUATION_TOKEN_KEY);

    } catch (error) {
        if (signal?.aborted) {
            console.log(`Fetch aborted`);
            return;
        }
        console.error('Error fetching comments from remote:', error);
    }
};
