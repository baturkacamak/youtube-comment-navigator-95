import { fetchCommentJsonDataFromRemote } from "./fetchCommentJsonDataFromRemote";
import { processRawJsonCommentsData } from "../../utils/comments/retrieveYouTubeCommentPaths";
import { extractContinuationToken, extractReplyTasksFromRawData } from "./continuationTokenUtils";
import { db } from "../../../shared/utils/database/database";
import { dbEvents } from "../../../shared/utils/database/dbEvents";
import { setTotalCommentsCount } from "../../../../store/store";
import logger from "../../../shared/utils/logger";
import { ParallelReplyFetcher } from "./parallelReplyFetcher";

export interface FetchAndProcessResult {
    processedData: {
        items: any[];
    };
    token: string | null;
    hasQueuedReplies: boolean;
}

let activeReplyTasks = 0;
let localCommentCount = 0;

export const hasActiveReplyProcessing = (): boolean => {
    return activeReplyTasks > 0;
};

export const resetLocalCommentCount = () => {
    localCommentCount = 0;
};

// Add a function to get the existing comment count for a video
async function getExistingCommentCount(videoId: string): Promise<number> {
    try {
        return await db.comments.where('videoId').equals(videoId).count();
    } catch (error) {
        logger.error('Failed to retrieve existing comment count:', error);
        return 0;
    }
}

// Helper to upsert comments (update if exists, insert if new) based on commentId
async function upsertComments(comments: any[]) {
    if (!comments || comments.length === 0) return;

    const incomingIds = comments.map(c => c.commentId).filter(Boolean);
    if (incomingIds.length === 0) return;

    // Fetch existing records to get their PKs (id)
    const existingRecords = await db.comments
        .where('commentId')
        .anyOf(incomingIds)
        .toArray();

    const idMap = new Map(existingRecords.map(c => [c.commentId, c.id]));

    const commentsToSave = comments.map(c => {
        // If it exists, attach the existing ID to force an update
        if (idMap.has(c.commentId)) {
            return { ...c, id: idMap.get(c.commentId) };
        }
        // If it's new, ensure 'id' is undefined so Dexie generates it
        // (Removing 'id' property if it exists but is null/undefined just in case)
        const { id, ...rest } = c;
        return rest;
    });

    await db.comments.bulkPut(commentsToSave);
}

export const fetchAndProcessComments = async (token: string | null, videoId: string, windowObj: any, signal: AbortSignal, dispatch: any): Promise<FetchAndProcessResult> => {
    logger.start("fetchAndProcessComments");
    try {
        // Check if operation is already aborted before starting
        if (signal.aborted) {
            logger.info("Fetch operation was aborted before starting.");
            throw new DOMException('Fetch aborted', 'AbortError');
        }

        // Retrieve existing comment count
        const existingCommentCount = await getExistingCommentCount(videoId);
        localCommentCount = existingCommentCount;
        logger.info(`Starting with existing comment count: ${localCommentCount}`);

        const rawJsonData = await fetchCommentJsonDataFromRemote(token, windowObj, signal);

        // Check if operation was aborted during fetch
        if (signal.aborted) {
            logger.info("Fetch operation was aborted during data retrieval.");
            throw new DOMException('Fetch aborted', 'AbortError');
        }

        const continuationToken = extractContinuationToken(
            rawJsonData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems ||
            rawJsonData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || []
        );

        const mainProcessedData = processRawJsonCommentsData([rawJsonData], videoId);

        // Check if operation was aborted before database transaction
        if (signal.aborted) {
            logger.info("Fetch operation was aborted before database transaction.");
            throw new DOMException('Fetch aborted', 'AbortError');
        }

        // Use a single transaction for all operations
        const insertedCount = mainProcessedData.items.length;
        await db.transaction('rw', db.comments, async () => {
            await upsertComments(mainProcessedData.items);
            localCommentCount = await getExistingCommentCount(videoId); // Recalculate count accurately
            dispatch(setTotalCommentsCount(localCommentCount));
        });
        logger.success(`Inserted ${insertedCount} main comments into IndexedDB. Total count: ${localCommentCount}`);

        // Emit database event for reactive UI updates
        if (insertedCount > 0) {
            const commentIds = mainProcessedData.items.map((c: any) => c.commentId).filter(Boolean);
            dbEvents.emitCommentsAdded(videoId, insertedCount, commentIds);
            dbEvents.emitCountUpdated(videoId, localCommentCount);
        }

        const hasQueuedReplies = await queueReplyProcessing(rawJsonData, windowObj, signal, videoId, dispatch);

        logger.end("fetchAndProcessComments");
        return {
            processedData: mainProcessedData,
            token: continuationToken,
            hasQueuedReplies
        };
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            logger.info("Fetch operation was aborted.");
            throw err; // Re-throw AbortError to be caught by the caller
        }
        logger.error("Failed to fetch and process comments:", err);
        logger.end("fetchAndProcessComments");
        return {
            processedData: { items: [] },
            token: null,
            hasQueuedReplies: false
        };
    }
};

/**
 * Fetch reply tasks in parallel directly from content script context
 * Uses ParallelReplyFetcher with p-queue for concurrent processing
 *
 * This approach avoids the service worker limitation where requests don't get
 * proper browser headers (Referer, sec-fetch-site, etc.), which triggers
 * YouTube's bot detection.
 */
async function queueReplyProcessing(rawJsonData: any, windowObj: any, signal: AbortSignal, videoId: string, dispatch: any): Promise<boolean> {
    if (!rawJsonData || signal.aborted) {
        return false;
    }

    // Extract reply tasks from raw data
    const replyTasks = extractReplyTasksFromRawData(rawJsonData);

    if (replyTasks.length === 0) {
        logger.info("No reply tasks to queue.");
        return false;
    }

    logger.info(`[QueueReplyProcessing] Fetching ${replyTasks.length} reply tasks in parallel for video ${videoId}`);

    try {
        activeReplyTasks++;

        // Create parallel fetcher and queue all tasks
        const replyFetcher = new ParallelReplyFetcher(videoId, signal, dispatch);

        // Queue all tasks for parallel processing (non-blocking)
        // The fetcher will handle the concurrent requests and store replies in IndexedDB
        replyFetcher.queueReplyFetches(replyTasks).then(async () => {
            logger.success(`[QueueReplyProcessing] All reply tasks completed for ${videoId}`);
            activeReplyTasks--;

            // Update comment count after all replies are fetched
            try {
                const count = await getExistingCommentCount(videoId);
                dispatch(setTotalCommentsCount(count));
            } catch (e) {
                logger.error("Failed to update comment count after reply processing:", e);
            }
        }).catch((error) => {
            if (error?.name === 'AbortError') {
                logger.info(`[QueueReplyProcessing] Reply fetching aborted for ${videoId}`);
            } else {
                logger.error("[QueueReplyProcessing] Failed to complete reply tasks:", error);
            }
            activeReplyTasks--;
        });

        logger.success(`[QueueReplyProcessing] Successfully started fetching ${replyTasks.length} reply tasks`);
        return true;
    } catch (error) {
        logger.error("[QueueReplyProcessing] Failed to start reply tasks:", error);
        activeReplyTasks--;
        return false;
    }
}
