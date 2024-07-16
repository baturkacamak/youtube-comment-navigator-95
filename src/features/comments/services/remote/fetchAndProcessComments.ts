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
    const rawJsonData = await fetchCommentJsonDataFromRemote(token, windowObj, signal);
    const [comments, replies] = await Promise.all([
        fetchCommentJsonDataFromRemote(token, windowObj, signal),
        fetchRepliesJsonDataFromRemote(rawJsonData, windowObj, signal)
    ]);
    const allComments = [comments, ...replies];
    const processedData = processRawJsonCommentsData(allComments, videoId);
    await db.comments.bulkPut(processedData.items);
    return {
        processedData,
        token: extractContinuationToken(
            rawJsonData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems ||
            rawJsonData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || []
        )
    };
};
