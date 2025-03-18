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
    hasQueuedReplies: boolean; // New field to indicate if replies are being processed
}

// Track the count of active reply processing tasks
let activeReplyTasks = 0;

// Public method to check if background processing is happening
export const hasActiveReplyProcessing = (): boolean => {
    return activeReplyTasks > 0;
};

export const fetchAndProcessComments = async (token: string | null, videoId: string, windowObj: any, signal: AbortSignal): Promise<FetchAndProcessResult> => {
    // Fetch the main comments data
    const rawJsonData = await fetchCommentJsonDataFromRemote(token, windowObj, signal);

    // Extract continuation token for the next batch of main comments immediately
    const continuationToken = extractContinuationToken(
        rawJsonData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems ||
        rawJsonData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || []
    );

    // Process and store the main comments immediately
    const mainProcessedData = processRawJsonCommentsData([rawJsonData], videoId);
    await db.comments.bulkPut(mainProcessedData.items);

    // Start fetching replies asynchronously, don't wait for completion
    const hasQueuedReplies = await queueReplyProcessing(rawJsonData, windowObj, signal, videoId);

    // Return the main comments data and the continuation token
    // This allows the caller to continue fetching the next page immediately
    return {
        processedData: mainProcessedData,
        token: continuationToken,
        hasQueuedReplies
    };
};

/**
 * Queues the asynchronous fetching and processing of replies
 * without blocking the main comment fetching flow
 * Returns true if replies were queued for processing
 */
async function queueReplyProcessing(rawJsonData: any, windowObj: any, signal: AbortSignal, videoId: string): Promise<boolean> {
    // Check if replies are available to be processed
    if (!rawJsonData || signal.aborted) {
        return false;
    }

    // Increment active task counter
    activeReplyTasks++;

    // Process replies in the background
    fetchRepliesAndProcess(rawJsonData, windowObj, signal, videoId).finally(() => {
        // Decrement counter when finished, regardless of success or failure
        activeReplyTasks--;
    });

    return true;
}

/**
 * Asynchronously fetches and processes replies without blocking the main comment fetching flow
 */
async function fetchRepliesAndProcess(rawJsonData: any, windowObj: any, signal: AbortSignal, videoId: string): Promise<void> {
    try {
        // Fetch replies based on the main comments data
        const replies = await fetchRepliesJsonDataFromRemote(rawJsonData, windowObj, signal);

        if (replies && replies.length > 0) {
            // Process the replies
            const repliesProcessedData = processRawJsonCommentsData(replies, videoId);

            // Store the processed replies in the database
            if (repliesProcessedData.items.length > 0) {
                await db.comments.bulkPut(repliesProcessedData.items);
            }
        }
    } catch (error) {
        // Log errors but don't throw them, as this is a background task
        if (error instanceof Error && error.name !== 'AbortError') {
            console.error('Error processing replies:', error);
        }
    }
}