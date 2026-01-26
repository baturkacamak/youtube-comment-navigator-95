/**
 * Prioritized Reply Fetching
 * 
 * Fetches replies for comments in priority order (most replies first)
 * This provides better perceived performance as users see the most
 * interesting content (popular comments with many replies) first.
 */

import { db } from "../../../shared/utils/database/database";
import { fetchRepliesJsonDataFromRemote } from "./fetchReplies";
import { processRawJsonCommentsData } from "../../utils/comments/retrieveYouTubeCommentPaths";
import { fetchCommentJsonDataFromRemote } from "./fetchCommentJsonDataFromRemote";
import logger from "../../../shared/utils/logger";
import type { Comment } from "../../../../types/commentTypes";

// Extended comment type with reply token
interface CommentWithReplyToken extends Comment {
    replyContinuationToken?: string;
}

interface ReplyFetchProgress {
    current: number;
    total: number;
    commentId: string;
    replyCount: number;
}

export interface PrioritizedReplyOptions {
    delayBetweenRequests?: number; // ms to wait between requests (default: 1500)
    onProgress?: (progress: ReplyFetchProgress) => void;
    signal?: AbortSignal;
}

/**
 * Fetch replies for all comments in priority order (most replies first)
 * 
 * @param videoId - The YouTube video ID
 * @param windowObj - Window object with ytcfg data
 * @param options - Options for controlling fetch behavior
 */
export async function fetchRepliesInPriorityOrder(
    videoId: string,
    windowObj: any,
    options: PrioritizedReplyOptions = {}
): Promise<void> {
    const {
        delayBetweenRequests = 1500,
        onProgress,
        signal
    } = options;

    logger.info('[PrioritizedReplies] Starting prioritized reply fetch', { videoId });

    try {
        // Query all comments with replies
        const commentsWithReplies = (await db.comments
            .where('videoId')
            .equals(videoId)
            .and(comment => (comment.replyCount || 0) > 0)
            .toArray()) as CommentWithReplyToken[];

        // Sort by replyCount in descending order (most replies first)
        commentsWithReplies.sort((a, b) => (b.replyCount || 0) - (a.replyCount || 0));

        const totalToFetch = commentsWithReplies.length;
        logger.info(`[PrioritizedReplies] Found ${totalToFetch} comments with replies`);
        
        if (totalToFetch === 0) {
            logger.info('[PrioritizedReplies] No comments with replies to fetch');
            return;
        }

        // Log priority order (top 10)
        const topComments = commentsWithReplies.slice(0, 10);
        logger.info('[PrioritizedReplies] Top priority comments:', 
            topComments.map(c => ({ id: c.commentId.substring(0, 10), replies: c.replyCount }))
        );

        // Fetch replies for each comment sequentially
        let fetchedCount = 0;
        let totalRepliesFetched = 0;

        for (const comment of commentsWithReplies) {
            // Check for abort signal
            if (signal?.aborted) {
                logger.info('[PrioritizedReplies] Fetch aborted by signal');
                break;
            }

            fetchedCount++;
            const commentIdShort = comment.commentId.substring(0, 15);
            
            logger.info(`[PrioritizedReplies] [${fetchedCount}/${totalToFetch}] Fetching replies for comment ${commentIdShort} (${comment.replyCount} replies expected)`);

            try {
                // Fetch replies for this comment
                const repliesData = await fetchRepliesForSingleComment(
                    comment,
                    videoId,
                    windowObj,
                    signal
                );

                totalRepliesFetched += repliesData.repliesCount;
                
                logger.success(`[PrioritizedReplies] ✓ Fetched ${repliesData.repliesCount} replies for ${commentIdShort}`);

                // Call progress callback if provided
                if (onProgress) {
                    onProgress({
                        current: fetchedCount,
                        total: totalToFetch,
                        commentId: comment.commentId,
                        replyCount: repliesData.repliesCount
                    });
                }

                // Add delay between requests to avoid bot detection (with random jitter)
                if (fetchedCount < totalToFetch && delayBetweenRequests > 0) {
                    const jitter = (Math.random() - 0.5) * 0.3; // ±15% jitter
                    const actualDelay = Math.floor(delayBetweenRequests * (1 + jitter));
                    
                    logger.debug(`[PrioritizedReplies] Waiting ${actualDelay}ms before next request`);
                    await new Promise(resolve => setTimeout(resolve, actualDelay));
                }

            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    logger.info('[PrioritizedReplies] Fetch aborted during reply fetch');
                    throw error;
                }
                
                logger.error(`[PrioritizedReplies] Failed to fetch replies for ${commentIdShort}:`, error);
                // Continue with next comment even if one fails
            }
        }

        logger.success(`[PrioritizedReplies] ✓ Completed! Fetched ${totalRepliesFetched} total replies from ${fetchedCount} comments`);

    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            logger.info('[PrioritizedReplies] Operation aborted');
            throw error;
        }
        logger.error('[PrioritizedReplies] Error during prioritized reply fetch:', error);
        throw error;
    }
}

/**
 * Fetch all replies for a single comment
 * Uses the stored replyContinuationToken to fetch replies
 */
async function fetchRepliesForSingleComment(
    comment: CommentWithReplyToken,
    videoId: string,
    windowObj: any,
    signal?: AbortSignal
): Promise<{ repliesCount: number }> {
    
    try {
        // Check if we have a reply continuation token for this comment
        const replyToken = comment.replyContinuationToken;
        
        if (!replyToken) {
            logger.debug(`[PrioritizedReplies] No reply token for comment ${comment.commentId.substring(0, 10)}, skipping (might have 0 replies or token not stored)`);
            return { repliesCount: 0 };
        }

        if ((comment.replyCount || 0) === 0) {
            logger.debug(`[PrioritizedReplies] Comment ${comment.commentId.substring(0, 10)} has replyCount=0, skipping`);
            return { repliesCount: 0 };
        }

        logger.debug(`[PrioritizedReplies] Fetching with token: ${replyToken.substring(0, 30)}...`);

        // Fetch the initial reply page using the continuation token
        const replyThreadData = await fetchCommentJsonDataFromRemote(replyToken, windowObj, signal);
        
        // Fetch all replies recursively (handles pagination if there are more replies)
        const repliesData = await fetchRepliesJsonDataFromRemote(
            replyThreadData, 
            windowObj, 
            signal || new AbortController().signal
        );
        
        // Process replies into comment format
        const processedReplies = processRawJsonCommentsData(repliesData, videoId);
        
        if (processedReplies.items.length > 0) {
            // Upsert replies into database
            await upsertReplies(processedReplies.items);
            logger.debug(`[PrioritizedReplies] ✓ Stored ${processedReplies.items.length} replies in DB`);
        }

        return { repliesCount: processedReplies.items.length };
        
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw error;
        }
        logger.error(`[PrioritizedReplies] Error fetching replies for comment ${comment.commentId.substring(0, 10)}:`, error);
        return { repliesCount: 0 };
    }
}

/**
 * Upsert replies into database (same logic as main comments)
 */
async function upsertReplies(replies: any[]): Promise<void> {
    if (!replies || replies.length === 0) return;

    const incomingIds = replies.map(r => r.commentId).filter(Boolean);
    if (incomingIds.length === 0) return;

    // Fetch existing records to get their PKs (id)
    const existingRecords = await db.comments
        .where('commentId')
        .anyOf(incomingIds)
        .toArray();

    const idMap = new Map(existingRecords.map(c => [c.commentId, c.id]));

    const repliesToSave = replies.map(r => {
        // If it exists, attach the existing ID to force an update
        if (idMap.has(r.commentId)) {
            return { ...r, id: idMap.get(r.commentId) };
        }
        // If it's new, ensure 'id' is undefined so Dexie generates it
        const { id, ...rest } = r;
        return rest;
    });

    await db.comments.bulkPut(repliesToSave);
}
