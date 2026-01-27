import { fetchCommentJsonDataFromRemote } from "./fetchCommentJsonDataFromRemote";
import { extractReplyContinuationTokens } from "./continuationTokenUtils";

// Maximum concurrent reply fetches to avoid overwhelming the API
const MAX_CONCURRENT_REPLY_FETCHES = 5;

/**
 * Process tokens in parallel with concurrency control
 */
const processTokensBatch = async <T>(
    tokens: string[],
    processor: (token: string) => Promise<T>,
    maxConcurrent: number
): Promise<T[]> => {
    const results: T[] = [];

    // Process in batches of maxConcurrent
    for (let i = 0; i < tokens.length; i += maxConcurrent) {
        const batch = tokens.slice(i, i + maxConcurrent);
        const batchResults = await Promise.all(batch.map(processor));
        results.push(...batchResults);
    }

    return results;
};

export const fetchRepliesJsonDataFromRemote = async (rawJsonData: any, windowObj: any, signal: AbortSignal): Promise<any[]> => {
    const replies: any[] = [];

    // Queue-based parallel fetching with concurrency limit
    const processToken = async (token: string): Promise<string[]> => {
        const replyData = await fetchCommentJsonDataFromRemote(token, windowObj, signal);

        if (Array.isArray(replyData)) {
            replies.push(...replyData);
        } else {
            replies.push(replyData);
        }

        const continuationItems = replyData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems
            || replyData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || [];

        return extractReplyContinuationTokens(continuationItems);
    };

    // Process tokens level by level (BFS-style) with parallel fetching at each level
    let currentTokens: string[] = [];

    const continuationItems = rawJsonData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems
        || rawJsonData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || [];

    currentTokens = extractReplyContinuationTokens(continuationItems);

    while (currentTokens.length > 0) {
        // Fetch all current level tokens in parallel (with concurrency limit)
        const nextTokenArrays = await processTokensBatch(
            currentTokens,
            processToken,
            MAX_CONCURRENT_REPLY_FETCHES
        );

        // Flatten all continuation tokens for next iteration
        currentTokens = nextTokenArrays.flat();
    }

    return replies;
};
