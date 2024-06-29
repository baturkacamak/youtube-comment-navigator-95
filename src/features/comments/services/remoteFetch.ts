import {fetchCommentJsonDataFromRemote} from "./youtubeComments";
import {extractYouTubeVideoIdFromUrl} from "../../shared/utils/extractYouTubeVideoIdFromUrl";
import {getCachedDataIfValid, removeDataFromDB, storeDataInDB} from "../../shared/utils/cacheUtils";

import {CommentData} from "../../../types/commentTypes";
import {wildCardSearch} from "../../shared/utils/wildCardSearch";
import {CACHE_KEYS} from "../../shared/utils/environmentVariables";
import {delay} from "../../shared/utils/delay";
import {removeDuplicateComments} from "../utils/comments/removeDuplicateComments";
import {processRawJsonCommentsData} from "../utils/comments/retrieveYouTubeCommentPaths";

const extractContinuationToken = (continuationItems: any[]) => {
    return continuationItems.map((continuationItem: any) =>
        continuationItem.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token
    ).find((token: string | undefined) => token);
};

const fetchReplies = async (comment: any, windowObj: any): Promise<any[]> => {
    const replies: any[] = [];

    const fetchRepliesRecursively = async (token: string) => {
        let cleanToken = token.replace(/(%3D%3D)+$/g, '');
        let replyData: CommentData = await fetchCommentJsonDataFromRemote(cleanToken, windowObj, null, true);

        // Add the fetched replyData to replies
        replies.push(replyData);

        // Check for more tokens within the fetched replyData
        const moreTokens: string[] = wildCardSearch('**.continuationItemRenderer.button.buttonRenderer.command.continuationCommand.token', replyData);

        // Recursively fetch more replies if tokens are found
        if (moreTokens && moreTokens.length > 0) {
            await Promise.all(moreTokens.map(fetchRepliesRecursively));
        }
    };

    // Use the wildcard search to find all initial continuation tokens
    const initialTokens: string[] = wildCardSearch('**.continuationItemRenderer.continuationEndpoint.continuationCommand.token', comment);

    if (initialTokens && initialTokens.length > 0) {
        // Fetch all initial replies and then recursively fetch more if needed
        await Promise.all(initialTokens.map(fetchRepliesRecursively));
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
        const windowObj = window as any; // Cast window to any to use in YouTube logic
        let token: string | null = continuationToken || null;
        let totalComments: CommentData[] = [];
        do {
            if (signal?.aborted) {
                return;
            }

            await delay(100);

            allComments = [];
            const rawJsonData: CommentData = await fetchCommentJsonDataFromRemote(token, windowObj, null);
            allComments.push(rawJsonData);

            const continuationItems = rawJsonData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems
                || rawJsonData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || [];
            token = extractContinuationToken(continuationItems);

            // Fetch replies for each comment
            const replies = await fetchReplies(rawJsonData, windowObj);
            allComments.push(...replies);

            const processedData = processRawJsonCommentsData(allComments);
            totalComments.push(...processedData.items);
            const uniqueTempComments = removeDuplicateComments(totalComments);
            onCommentsFetched(uniqueTempComments);
            // Update temporary cache and continuation token
            await storeDataInDB(TEMP_CACHE_KEY, uniqueTempComments, true);
            localStorage.setItem(CONTINUATION_TOKEN_KEY, token || '');
        } while (token);

        const uniqueFinalComments = removeDuplicateComments(totalComments);
        if (uniqueFinalComments.length > 0) {
            await storeDataInDB(LOCAL_STORAGE_KEY, uniqueFinalComments, true);
        }

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