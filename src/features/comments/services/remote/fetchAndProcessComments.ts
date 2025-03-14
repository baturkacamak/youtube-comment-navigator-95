// src/features/comments/services/remote/fetchAndProcessComments.ts
import { fetchCommentJsonDataFromRemote } from "./fetchCommentJsonDataFromRemote";
import { fetchRepliesJsonDataFromRemote } from "./fetchReplies";
import { processRawJsonCommentsData } from "../../utils/comments/retrieveYouTubeCommentPaths";
import { extractContinuationToken } from "./continuationTokenUtils";
import { db } from "../../../shared/utils/database/database";

export interface FetchAndProcessResult {
    processedData: {
        items: any[];
    };
    token: string | null;
}

export const fetchAndProcessComments = async (token: string | null, videoId: string, windowObj: any, signal: AbortSignal) => {
    // Fetch comment data once
    const rawJsonData = await fetchCommentJsonDataFromRemote(token, windowObj, signal);

    // Just fetch replies using the already fetched data
    const replies = await fetchRepliesJsonDataFromRemote(rawJsonData, windowObj, signal);

    const allComments = [rawJsonData, ...replies];
    const processedData = processRawJsonCommentsData(allComments, videoId);

    const commentIds = new Set();
    const uniqueComments = processedData.items.filter(comment => {
        if (commentIds.has(comment.commentId)) {
            return false;
        }
        commentIds.add(comment.commentId);
        return true;
    });

    await db.comments.bulkPut(uniqueComments);

    return {
        processedData: { items: uniqueComments },
        token: extractContinuationToken(
            rawJsonData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems ||
            rawJsonData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || []
        )
    };
};
