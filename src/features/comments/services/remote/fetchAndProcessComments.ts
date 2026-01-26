import { fetchCommentJsonDataFromRemote } from "./fetchCommentJsonDataFromRemote";
import { fetchRepliesJsonDataFromRemote } from "./fetchReplies";
import { processRawJsonCommentsData } from "../../utils/comments/retrieveYouTubeCommentPaths";
import { extractContinuationToken } from "./continuationTokenUtils";
import { db } from "../../../shared/utils/database/database";
import { dbEvents } from "../../../shared/utils/database/dbEvents";
import { setTotalCommentsCount } from "../../../../store/store";
import logger from "../../../shared/utils/logger";
import { performanceMonitor } from "../../../shared/utils/PerformanceMonitor";

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

    performanceMonitor.start(`IndexedDB Upsert (${comments.length} items)`);
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
        const { id, ...rest } = c;
        return rest;
    });

    await db.comments.bulkPut(commentsToSave);
    performanceMonitor.end(`IndexedDB Upsert (${comments.length} items)`);
}

export const fetchAndProcessComments = async (token: string | null, videoId: string, windowObj: any, signal: AbortSignal, dispatch: any): Promise<FetchAndProcessResult> => {
    logger.start("fetchAndProcessComments");
    performanceMonitor.start("Total Fetch & Process Operation");
    performanceMonitor.measureMemory("Start Fetch");

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

        performanceMonitor.start("Network Fetch (Main)");
        const rawJsonData = await fetchCommentJsonDataFromRemote(token, windowObj, signal);
        performanceMonitor.end("Network Fetch (Main)");

        // Check if operation was aborted during fetch
        if (signal.aborted) {
            logger.info("Fetch operation was aborted during data retrieval.");
            throw new DOMException('Fetch aborted', 'AbortError');
        }

        const continuationToken = extractContinuationToken(
            rawJsonData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems ||
            rawJsonData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || []
        );

        performanceMonitor.start("Process JSON Logic");
        const mainProcessedData = processRawJsonCommentsData([rawJsonData], videoId);
        performanceMonitor.end("Process JSON Logic", { count: mainProcessedData.items.length });

        // Check if operation was aborted before database transaction
        if (signal.aborted) {
            logger.info("Fetch operation was aborted before database transaction.");
            throw new DOMException('Fetch aborted', 'AbortError');
        }

        // Use a single transaction for all operations
        const insertedCount = mainProcessedData.items.length;
        performanceMonitor.start("IndexedDB Transaction (Main)");
        await db.transaction('rw', db.comments, async () => {
            await upsertComments(mainProcessedData.items);
            localCommentCount = await getExistingCommentCount(videoId); // Recalculate count accurately
            dispatch(setTotalCommentsCount(localCommentCount));
        });
        performanceMonitor.end("IndexedDB Transaction (Main)");
        
        logger.success(`Inserted ${insertedCount} main comments into IndexedDB. Total count: ${localCommentCount}`);

        // Emit database event for reactive UI updates
        if (insertedCount > 0) {
            const commentIds = mainProcessedData.items.map((c: any) => c.commentId).filter(Boolean);
            dbEvents.emitCommentsAdded(videoId, insertedCount, commentIds);
            dbEvents.emitCountUpdated(videoId, localCommentCount);
        }

        const hasQueuedReplies = await queueReplyProcessing(rawJsonData, windowObj, signal, videoId, dispatch);

        performanceMonitor.measureMemory("End Fetch");
        performanceMonitor.end("Total Fetch & Process Operation");
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
        performanceMonitor.end("Total Fetch & Process Operation"); // Ensure we close the timer
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
    performanceMonitor.start("Reply Processing (Total)");
    
    try {
        // Check if already aborted
        if (signal.aborted) {
            logger.info("Reply processing was aborted before starting.");
            throw new DOMException('Reply processing aborted', 'AbortError');
        }
        
        performanceMonitor.start("Network Fetch (Replies)");
        const replies = await fetchRepliesJsonDataFromRemote(rawJsonData, windowObj, signal);
        performanceMonitor.end("Network Fetch (Replies)");

        if (signal.aborted) {
            logger.info("Reply processing was aborted after fetching replies.");
            throw new DOMException('Reply processing aborted', 'AbortError');
        }

        if (replies && replies.length > 0) {
            const BATCH_SIZE = 50; // Increased batch size
            logger.info(`Processing ${replies.length} replies.`);
            performanceMonitor.start(`Process & Save Replies (${replies.length})`);

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
            performanceMonitor.end(`Process & Save Replies (${replies.length})`);
            
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
        performanceMonitor.end("Reply Processing (Total)");
    }
}