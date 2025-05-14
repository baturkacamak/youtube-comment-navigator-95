import { fetchCommentJsonDataFromRemote } from "./fetchCommentJsonDataFromRemote";
import { fetchRepliesJsonDataFromRemote } from "./fetchReplies";
import { processRawJsonCommentsData } from "../../utils/comments/retrieveYouTubeCommentPaths";
import { extractContinuationToken } from "./continuationTokenUtils";
import { db } from "../../../shared/utils/database/database";
import { addProcessedReplies, setTotalCommentsCount } from "../../../../store/store";
import logger from "../../../shared/utils/logger";

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
        await db.transaction('rw', db.comments, async () => {
            await db.comments.bulkPut(mainProcessedData.items);
            localCommentCount += mainProcessedData.items.length;
            dispatch(setTotalCommentsCount(localCommentCount));
        });
        logger.success(`Inserted ${mainProcessedData.items.length} main comments into IndexedDB. Total count: ${localCommentCount}`);

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

async function queueReplyProcessing(rawJsonData: any, windowObj: any, signal: AbortSignal, videoId: string, dispatch: any): Promise<boolean> {
    if (!rawJsonData || signal.aborted) {
        return false;
    }

    activeReplyTasks++;
    fetchRepliesAndProcess(rawJsonData, windowObj, signal, videoId, dispatch).finally(() => {
        activeReplyTasks--;
    });

    return true;
}

async function fetchRepliesAndProcess(rawJsonData: any, windowObj: any, signal: AbortSignal, videoId: string, dispatch: any): Promise<void> {
    logger.start("fetchRepliesAndProcess");
    try {
        // Check if already aborted
        if (signal.aborted) {
            logger.info("Reply processing was aborted before starting.");
            throw new DOMException('Reply processing aborted', 'AbortError');
        }
        
        const replies = await fetchRepliesJsonDataFromRemote(rawJsonData, windowObj, signal);

        if (signal.aborted) {
            logger.info("Reply processing was aborted after fetching replies.");
            throw new DOMException('Reply processing aborted', 'AbortError');
        }

        if (replies && replies.length > 0) {
            const BATCH_SIZE = 50; // Increased batch size
            logger.info(`Processing ${replies.length} replies.`);

            // Process all batches in a single transaction
            await db.transaction('rw', db.comments, async () => {
                for (let i = 0; i < replies.length; i += BATCH_SIZE) {
                    // Check for abort before each batch
                    if (signal.aborted) {
                        logger.warn("Reply processing aborted before batch");
                        throw new DOMException('Reply processing aborted', 'AbortError');
                    }
                    
                    const batch = replies.slice(i, i + BATCH_SIZE);
                    const batchProcessedData = processRawJsonCommentsData(batch, videoId);

                    if (batchProcessedData.items.length > 0) {
                        await db.comments.bulkPut(batchProcessedData.items);
                        localCommentCount += batchProcessedData.items.length;
                    }

                    if (signal.aborted) {
                        logger.warn("Reply processing aborted midway.");
                        throw new DOMException('Reply processing aborted', 'AbortError');
                    }
                }
                // Update Redux store once after all batches are processed
                dispatch(setTotalCommentsCount(localCommentCount));
            });
            logger.success(`Saved ${replies.length} replies to IndexedDB. Total count: ${localCommentCount}`);
        } else {
            logger.info("No replies to process.");
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            logger.warn("Reply processing was aborted.");
            throw error; // Rethrow to be caught by caller
        } else {
            logger.error("Error processing replies:", error);
        }
    } finally {
        logger.end("fetchRepliesAndProcess");
    }
}
