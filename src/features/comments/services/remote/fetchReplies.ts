import { fetchCommentJsonDataFromRemote } from "./fetchCommentJsonDataFromRemote";
import { extractReplyContinuationTokens } from "./continuationTokenUtils";

export const fetchRepliesJsonDataFromRemote = async (rawJsonData: any, windowObj: any, signal: AbortSignal): Promise<any[]> => {
    let replies: any[] = [];

    const fetchRepliesRecursively = async (tokens: string[]) => {
        for (const token of tokens) {
            const replyData = await fetchCommentJsonDataFromRemote(token, windowObj, true, signal);

            if (Array.isArray(replyData)) {
                replies = [...replies, ...replyData];
            } else {
                replies.push(replyData);
            }

            const continuationItems = replyData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems
                || replyData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || [];

            const newTokens = extractReplyContinuationTokens(continuationItems);
            if (newTokens.length > 0) {
                await fetchRepliesRecursively(newTokens);
            }
        }
    };

    const continuationItems = rawJsonData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems
        || rawJsonData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || [];

    const initialTokens = extractReplyContinuationTokens(continuationItems);
    if (initialTokens.length > 0) {
        await fetchRepliesRecursively(initialTokens);
    }

    return replies;
};
