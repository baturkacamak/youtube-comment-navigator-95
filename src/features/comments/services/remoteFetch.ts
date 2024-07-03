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

    // Get the token from the last item in the continuationItems array
    const lastItem = continuationItems[continuationItems.length - 1];
    return lastItem?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token || null;
};

const extractReplyContinuationTokens = (continuationItems: any[]): string[] | null => {
    if (!continuationItems || continuationItems.length === 0) {
        return null;
    }

    // Collect all valid tokens in an array when extracting replies
    const tokens = continuationItems.map((continuationItem: any) =>
        continuationItem.commentThreadRenderer?.replies?.commentRepliesRenderer?.contents?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token
    ).filter((token: string | undefined) => token !== undefined) as string[];

    return tokens.length > 0 ? tokens : null;
};


const fetchReplies = async (rawJsonData: any, windowObj: any) => {
    const replies: any[] = [];

    const fetchRepliesRecursively = async (token: string) => {
        // Fetch data using the token and process it.
        const replyData = await fetchCommentJsonDataFromRemote(token, windowObj, null);
        replies.push(replyData);

        // Extract new continuation items and tokens
        const continuationItems = replyData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems
            || replyData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || [];
        const newToken = extractContinuationToken(continuationItems);
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
        let processedData: { items: any[] } = {items: []};
        const windowObj = window as any; // Cast window to any to use in YouTube logic
        let token: string | null = continuationToken || null;
        let totalComments: CommentData[] = [];

        do {
            if (signal?.aborted) {
                return;
            }

            // Reset allComments and processedData at the start of each iteration
            allComments = [];
            processedData = {items: []};

            const rawJsonData: CommentData = await fetchCommentJsonDataFromRemote(token, windowObj, null);
            allComments.push(rawJsonData);

            // Fetch replies for each comment
            const replies = await fetchReplies(rawJsonData, windowObj);
            allComments.push(...replies);

            processedData = processRawJsonCommentsData(allComments);
            onCommentsFetched(processedData.items);
            totalComments.push(...processedData.items);

            const continuationItems = rawJsonData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems
                || rawJsonData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || [];
            token = extractContinuationToken(continuationItems);

        } while (token);

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