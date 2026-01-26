/**
 * Comment Batch Accumulator
 *
 * Accumulates fetched comments in memory and writes to IndexedDB in larger batches
 * to reduce database I/O overhead during heavy fetching operations.
 */

import { db } from '../../../shared/utils/database/database';
import { dbEvents } from '../../../shared/utils/database/dbEvents';
import logger from '../../../shared/utils/logger';

/** Default batch size for flushing comments to IndexedDB */
const DEFAULT_BATCH_SIZE = 500;

/** Minimum batch size before allowing manual flush */
const MIN_FLUSH_SIZE = 1;

interface AccumulatorState {
    buffer: any[];
    videoId: string;
    isFresh: boolean;
    totalFlushed: number;
}

// Per-video accumulators
const accumulators = new Map<string, AccumulatorState>();

/**
 * Get or create an accumulator for a video.
 * @param videoId - The video ID
 * @param isFresh - Whether this is a fresh video (no existing comments)
 */
function getAccumulator(videoId: string, isFresh: boolean = false): AccumulatorState {
    let acc = accumulators.get(videoId);
    if (!acc) {
        acc = {
            buffer: [],
            videoId,
            isFresh,
            totalFlushed: 0,
        };
        accumulators.set(videoId, acc);
        logger.debug(`[BatchAccumulator] Created accumulator for video ${videoId} (fresh: ${isFresh})`);
    }
    return acc;
}

/**
 * Helper to upsert comments into IndexedDB.
 * @param comments - Array of comment objects to upsert
 * @param skipLookup - If true, skips the read phase (use for fresh videos)
 */
async function upsertCommentsBatch(comments: any[], skipLookup: boolean = false): Promise<void> {
    if (!comments || comments.length === 0) return;

    const incomingIds = comments.map(c => c.commentId).filter(Boolean);
    if (incomingIds.length === 0) return;

    // Fast path: For fresh videos, skip the lookup entirely
    if (skipLookup) {
        const commentsToAdd = comments.map(c => {
            const { id, ...rest } = c;
            return rest;
        });

        try {
            await db.comments.bulkAdd(commentsToAdd);
            return;
        } catch (error: any) {
            if (error.name !== 'BulkError') {
                throw error;
            }
            logger.warn(`[BatchAccumulator] bulkAdd had ${error.failures?.length || 'some'} duplicates, falling back to upsert`);
        }
    }

    // Standard path: Read-before-write for proper upsert behavior
    const existingRecords = await db.comments
        .where('commentId')
        .anyOf(incomingIds)
        .toArray();

    const idMap = new Map(existingRecords.map(c => [c.commentId, c.id]));

    const commentsToSave = comments.map(c => {
        if (idMap.has(c.commentId)) {
            return { ...c, id: idMap.get(c.commentId) };
        }
        const { id, ...rest } = c;
        return rest;
    });

    await db.comments.bulkPut(commentsToSave);
}

/**
 * Add comments to the accumulator buffer.
 * Automatically flushes when the buffer reaches the batch size.
 * IMPORTANT: Flushes immediately on the first batch so users see content right away.
 *
 * @param videoId - The video ID
 * @param comments - Array of processed comment objects
 * @param options - Configuration options
 * @returns The number of comments flushed (0 if buffer hasn't reached threshold)
 */
export async function accumulateComments(
    videoId: string,
    comments: any[],
    options: {
        batchSize?: number;
        isFresh?: boolean;
    } = {}
): Promise<number> {
    const { batchSize = DEFAULT_BATCH_SIZE, isFresh = false } = options;

    if (!comments || comments.length === 0) return 0;

    const acc = getAccumulator(videoId, isFresh);
    acc.buffer.push(...comments);

    logger.debug(`[BatchAccumulator] Added ${comments.length} comments to buffer. Total buffered: ${acc.buffer.length}`);

    // IMMEDIATE FLUSH: Show first batch immediately so users don't stare at empty screen
    // This ensures good UX while still batching subsequent fetches for performance
    if (acc.totalFlushed === 0) {
        logger.info(`[BatchAccumulator] First batch - flushing immediately for instant display`);
        return await flushAccumulator(videoId);
    }

    // Auto-flush if buffer reaches threshold
    if (acc.buffer.length >= batchSize) {
        return await flushAccumulator(videoId);
    }

    return 0;
}

/**
 * Flush all accumulated comments for a video to IndexedDB.
 *
 * @param videoId - The video ID
 * @param emitEvents - Whether to emit database events (default: true)
 * @returns The number of comments flushed
 */
export async function flushAccumulator(videoId: string, emitEvents: boolean = true): Promise<number> {
    const acc = accumulators.get(videoId);
    if (!acc || acc.buffer.length < MIN_FLUSH_SIZE) {
        return 0;
    }

    const commentsToFlush = [...acc.buffer];
    const count = commentsToFlush.length;
    acc.buffer = [];

    logger.info(`[BatchAccumulator] Flushing ${count} comments to IndexedDB for video ${videoId}`);

    try {
        await db.transaction('rw', db.comments, async () => {
            // Use skipLookup for the first flush of a fresh video
            await upsertCommentsBatch(commentsToFlush, acc.isFresh && acc.totalFlushed === 0);
        });

        acc.totalFlushed += count;
        // After first flush, no longer fresh
        acc.isFresh = false;

        logger.success(`[BatchAccumulator] Flushed ${count} comments. Total flushed: ${acc.totalFlushed}`);

        // Emit events for UI updates
        if (emitEvents) {
            const commentIds = commentsToFlush.map((c: any) => c.commentId).filter(Boolean);
            dbEvents.emitBulkCommentsAdded(videoId, count);

            // Get updated count for the count event
            const totalCount = await db.comments.where('videoId').equals(videoId).count();
            dbEvents.emitCountUpdated(videoId, totalCount);
        }

        return count;
    } catch (error) {
        // On error, restore the buffer
        acc.buffer = [...commentsToFlush, ...acc.buffer];
        logger.error(`[BatchAccumulator] Failed to flush comments:`, error);
        throw error;
    }
}

/**
 * Get the current buffer size for a video.
 *
 * @param videoId - The video ID
 * @returns The number of comments currently buffered
 */
export function getBufferSize(videoId: string): number {
    const acc = accumulators.get(videoId);
    return acc?.buffer.length ?? 0;
}

/**
 * Get the total number of comments flushed for a video in this session.
 *
 * @param videoId - The video ID
 * @returns The total number of comments flushed
 */
export function getTotalFlushed(videoId: string): number {
    const acc = accumulators.get(videoId);
    return acc?.totalFlushed ?? 0;
}

/**
 * Clear the accumulator for a video.
 * Call this when switching videos or cleaning up.
 *
 * @param videoId - The video ID
 * @param flush - Whether to flush remaining comments before clearing (default: true)
 */
export async function clearAccumulator(videoId: string, flush: boolean = true): Promise<void> {
    if (flush) {
        await flushAccumulator(videoId);
    }
    accumulators.delete(videoId);
    logger.debug(`[BatchAccumulator] Cleared accumulator for video ${videoId}`);
}

/**
 * Clear all accumulators.
 *
 * @param flush - Whether to flush remaining comments before clearing (default: true)
 */
export async function clearAllAccumulators(flush: boolean = true): Promise<void> {
    if (flush) {
        const flushPromises = Array.from(accumulators.keys()).map(videoId =>
            flushAccumulator(videoId).catch(err =>
                logger.error(`[BatchAccumulator] Error flushing ${videoId}:`, err)
            )
        );
        await Promise.all(flushPromises);
    }
    accumulators.clear();
    logger.debug('[BatchAccumulator] Cleared all accumulators');
}
