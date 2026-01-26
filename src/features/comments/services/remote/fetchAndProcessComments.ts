import { fetchCommentJsonDataFromRemote } from "./fetchCommentJsonDataFromRemote";
import { fetchRepliesJsonDataFromRemote } from "./fetchReplies";
import { processRawJsonCommentsData } from "../../utils/comments/retrieveYouTubeCommentPaths";
import { extractContinuationToken, extractReplyContinuationTokens } from "./continuationTokenUtils";
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

/**
 * Extract reply continuation tokens from raw JSON and map them to comment IDs
 * Returns a Map of commentId -> replyContinuationToken
 */
function extractReplyTokensForComments(rawJsonData: any): Map<string, string> {
    const tokenMap = new Map<string, string>();
    
    try {
        const continuationItems = rawJsonData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems
            || rawJsonData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems
            || [];

        for (const item of continuationItems) {
            const commentThreadRenderer = item.commentThreadRenderer;
            if (!commentThreadRenderer) continue;

            // Get comment ID from the thread
            const commentViewModel = commentThreadRenderer.commentViewModel?.commentViewModel;
            const commentId = commentViewModel?.commentKey || 
                             commentThreadRenderer.comment?.commentRenderer?.commentId;
            
            // Get reply continuation token
            const replyToken = commentThreadRenderer.replies?.commentRepliesRenderer?.contents?.[0]
                ?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token ||
                commentThreadRenderer.replies?.commentRepliesRenderer?.continuations?.[0]
                ?.nextContinuationData?.continuation;

            if (commentId && replyToken) {
                tokenMap.set(commentId, replyToken);
            }
        }

        logger.debug(`Extracted ${tokenMap.size} reply continuation tokens`);
    } catch (error) {
        logger.error('Error extracting reply tokens:', error);
    }

    return tokenMap;
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

        // Extract reply continuation tokens from raw JSON and store them with comments
        const replyTokensMap = extractReplyTokensForComments(rawJsonData);
        
        // Attach reply tokens to comments
        const commentsWithTokens = mainProcessedData.items.map(comment => {
            const replyToken = replyTokensMap.get(comment.commentId);
            return replyToken ? { ...comment, replyContinuationToken: replyToken } : comment;
        });

        // Use a single transaction for all operations
        await db.transaction('rw', db.comments, async () => {
            await upsertComments(commentsWithTokens);
            localCommentCount = await getExistingCommentCount(videoId); // Recalculate count accurately
            dispatch(setTotalCommentsCount(localCommentCount));
        });
        logger.success(`Inserted ${mainProcessedData.items.length} main comments into IndexedDB. Total count: ${localCommentCount}`);

        // NOTE: Reply processing is now deferred to Phase 2 (prioritized fetching)
        // We no longer queue reply processing here to allow all main comments to load first

        logger.end("fetchAndProcessComments");
        return {
            processedData: mainProcessedData,
            token: continuationToken,
            hasQueuedReplies: false // Always false now, replies are fetched separately
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
    const timerId = `fetchRepliesAndProcess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    logger.start(timerId);
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
                        await upsertComments(batchProcessedData.items);
                    }

                    if (signal.aborted) {
                        logger.warn("Reply processing aborted midway.");
                        throw new DOMException('Reply processing aborted', 'AbortError');
                    }
                }
                // Update Redux store once after all batches are processed
                localCommentCount = await getExistingCommentCount(videoId); // Recalculate count
                dispatch(setTotalCommentsCount(localCommentCount));
            });
            logger.success(`Saved ${replies.length} replies to IndexedDB. Total count: ${localCommentCount}`);
        } else {
            logger.info("No replies to process.");
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            logger.info("Reply processing was aborted.");
            throw error; // Rethrow to be caught by caller
        } else {
            logger.error("Error processing replies:", error);
        }
    } finally {
        logger.end(timerId);
    }
}
