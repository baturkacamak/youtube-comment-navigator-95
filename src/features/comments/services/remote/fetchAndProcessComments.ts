import { fetchCommentJsonDataFromRemote } from "./fetchCommentJsonDataFromRemote";
import { fetchRepliesJsonDataFromRemote } from "./fetchReplies";
import { processRawJsonCommentsData } from "../../utils/comments/retrieveYouTubeCommentPaths";
import { extractContinuationToken } from "./continuationTokenUtils";
import { db } from "../../../shared/utils/database/database";
import { dbEvents } from "../../../shared/utils/database/dbEvents";
import logger from "../../../shared/utils/logger";
import {
    accumulateComments,
    flushAccumulator,
    getBufferSize,
    clearAccumulator,
} from "./commentBatchAccumulator";

export interface FetchAndProcessResult {
    processedData: {
        items: any[];
    };
    token: string | null;
    hasQueuedReplies: boolean;
}

let activeReplyTasks = 0;
let localCommentCount = 0;
// Track videos that are known to be fresh (no existing comments at session start)
const freshVideoSessions = new Set<string>();

/**
 * Configuration for batch accumulation.
 * When enabled, comments are accumulated in memory and written in larger batches.
 */
export const BATCH_CONFIG = {
    /** Enable batch accumulation for main comments (set to true for high-volume fetching) */
    USE_ACCUMULATOR: true,
    /** Number of comments to accumulate before flushing to IndexedDB */
    BATCH_SIZE: 500,
    /** Batch size for reply processing (within transactions) */
    REPLY_BATCH_SIZE: 50,
};

export const hasActiveReplyProcessing = (): boolean => {
    return activeReplyTasks > 0;
};

export const resetLocalCommentCount = () => {
    localCommentCount = 0;
};

/**
 * Flush any buffered comments to IndexedDB.
 * Call this when fetching is complete or paused to ensure all comments are persisted.
 *
 * @param videoId - The video ID to flush
 * @returns The number of comments flushed
 */
export const flushBufferedComments = async (videoId: string): Promise<number> => {
    if (!BATCH_CONFIG.USE_ACCUMULATOR) {
        return 0;
    }

    const flushed = await flushAccumulator(videoId);
    if (flushed > 0) {
        localCommentCount = await getExistingCommentCount(videoId);
        logger.success(`Flushed ${flushed} buffered comments. Total count: ${localCommentCount}`);
    }
    return flushed;
};

/**
 * Clear accumulator for a video (call when switching videos or cleaning up).
 *
 * @param videoId - The video ID
 * @param flush - Whether to flush remaining comments before clearing (default: true)
 */
export const cleanupVideoAccumulator = async (videoId: string, flush: boolean = true): Promise<void> => {
    if (BATCH_CONFIG.USE_ACCUMULATOR) {
        await clearAccumulator(videoId, flush);
    }
    clearFreshVideoMarker(videoId);
};

/**
 * Mark a video as fresh (no existing comments) for optimized inserts.
 * Call this when starting a fetch session for a new video.
 */
export const markVideoAsFresh = (videoId: string) => {
    freshVideoSessions.add(videoId);
};

/**
 * Clear the fresh video marker (e.g., after first batch is inserted).
 */
export const clearFreshVideoMarker = (videoId: string) => {
    freshVideoSessions.delete(videoId);
};

/**
 * Check if a video is marked as fresh.
 */
export const isVideoFresh = (videoId: string): boolean => {
    return freshVideoSessions.has(videoId);
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
 * Upsert comments into IndexedDB.
 *
 * Optimization strategies:
 * 1. If skipLookup is true (fresh video), uses bulkAdd directly (faster, no read-before-write)
 * 2. Otherwise, does a read-before-write to preserve existing primary keys for updates
 *
 * @param comments - Array of comment objects to upsert
 * @param skipLookup - If true, skips the read phase (use for fresh videos with no existing comments)
 */
async function upsertComments(comments: any[], skipLookup: boolean = false) {
    if (!comments || comments.length === 0) return;

    const incomingIds = comments.map(c => c.commentId).filter(Boolean);
    if (incomingIds.length === 0) return;

    // Fast path: For fresh videos, skip the lookup entirely
    if (skipLookup) {
        const commentsToAdd = comments.map(c => {
            // Remove 'id' so Dexie auto-generates it
            const { id, ...rest } = c;
            return rest;
        });

        try {
            await db.comments.bulkAdd(commentsToAdd);
            return;
        } catch (error: any) {
            // If bulkAdd fails due to constraint violation (duplicates), fall through to upsert logic
            if (error.name !== 'BulkError') {
                throw error;
            }
            logger.warn(`[upsertComments] bulkAdd had ${error.failures?.length || 'some'} duplicates, falling back to upsert`);
            // Fall through to the standard upsert path below
        }
    }

    // Standard path: Read-before-write for proper upsert behavior
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

        // Retrieve existing comment count and determine if this is a fresh video
        const existingCommentCount = await getExistingCommentCount(videoId);
        localCommentCount = existingCommentCount;
        const isFreshVideo = existingCommentCount === 0;
        if (isFreshVideo) {
            markVideoAsFresh(videoId);
        }
        logger.info(`Starting with existing comment count: ${localCommentCount} (fresh: ${isFreshVideo})`);

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

        // Insert comments into IndexedDB
        const insertedCount = mainProcessedData.items.length;
        const skipLookup = isVideoFresh(videoId);

        if (BATCH_CONFIG.USE_ACCUMULATOR) {
            // Batch accumulator mode: buffer comments and flush in larger batches
            const flushed = await accumulateComments(videoId, mainProcessedData.items, {
                batchSize: BATCH_CONFIG.BATCH_SIZE,
                isFresh: skipLookup,
            });

            // Update local count if we flushed
            if (flushed > 0) {
                localCommentCount = await getExistingCommentCount(videoId);
            }

            // Log buffering status
            const buffered = getBufferSize(videoId);
            logger.info(`Buffered ${insertedCount} comments (total buffered: ${buffered}, flushed: ${flushed})`);
        } else {
            // Direct mode: Write immediately to IndexedDB
            await db.transaction('rw', db.comments, async () => {
                await upsertComments(mainProcessedData.items, skipLookup);
                localCommentCount = await getExistingCommentCount(videoId);
            });

            // After first successful insert, clear fresh marker since we now have comments
            if (skipLookup && insertedCount > 0) {
                clearFreshVideoMarker(videoId);
            }

            logger.success(`Inserted ${insertedCount} main comments into IndexedDB. Total count: ${localCommentCount}`);

            // Emit database event for reactive UI updates
            if (insertedCount > 0) {
                const commentIds = mainProcessedData.items.map((c: any) => c.commentId).filter(Boolean);
                dbEvents.emitCommentsAdded(videoId, insertedCount, commentIds);
                dbEvents.emitCountUpdated(videoId, localCommentCount);
            }
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
            const BATCH_SIZE = BATCH_CONFIG.REPLY_BATCH_SIZE;
            logger.info(`Processing ${replies.length} replies (batch size: ${BATCH_SIZE}).`);

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
                
                // Recalculate count
                localCommentCount = await getExistingCommentCount(videoId); 
            });
            
            // Emit final event
            dbEvents.emitRepliesAdded(videoId, replies.length); // Approximate count
            dbEvents.emitCountUpdated(videoId, localCommentCount);

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