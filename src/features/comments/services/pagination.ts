// src/features/comments/services/pagination.ts
import { db } from "../../shared/utils/database/database";
import { Comment } from "../../../types/commentTypes";
import Dexie from 'dexie';
import { PAGINATION } from "../../shared/utils/appConstants.ts";
import logger from "../../shared/utils/logger";

export const loadPagedComments = async (
    videoId: string,
    page: number = PAGINATION.INITIAL_PAGE,
    pageSize: number = PAGINATION.DEFAULT_PAGE_SIZE,
    sortBy: string = 'date',
    sortOrder: string = 'desc'
): Promise<Comment[]> => {
    const label = `[loadPagedComments] page ${page} (${sortBy} ${sortOrder})`;
    logger.start(label);

    try {
        logger.info(`Loading page ${page} (size ${pageSize}) for video ${videoId}, sort: ${sortBy} ${sortOrder}`);

        const offset = page * pageSize;
        const baseIndex = 'videoId+replyLevel';
        const buildIndexKey = (field: string) => `[${baseIndex}+${field}]`;

        const bounds = {
            lower: [videoId, 0, Dexie.minKey],
            upper: [videoId, 0, Dexie.maxKey],
        };

        logger.start(`${label} querySetup`);
        let collection: Dexie.Collection<Comment, number>;
        switch (sortBy) {
            case 'date':
                collection = db.comments.where(buildIndexKey('publishedDate')).between(bounds.lower, bounds.upper, true, true);
                break;
            case 'likes':
                collection = db.comments.where(buildIndexKey('likes')).between(bounds.lower, bounds.upper, true, true);
                break;
            case 'replies':
                collection = db.comments.where(buildIndexKey('replyCount')).between(bounds.lower, bounds.upper, true, true);
                break;
            case 'author':
                collection = db.comments.where(buildIndexKey('author')).between(bounds.lower, bounds.upper, true, true);
                break;
            case 'normalized':
                collection = db.comments.where(buildIndexKey('normalizedScore')).between(bounds.lower, bounds.upper, true, true);
                break;
            case 'zscore':
                collection = db.comments.where(buildIndexKey('weightedZScore')).between(bounds.lower, bounds.upper, true, true);
                break;
            case 'bayesian':
                collection = db.comments.where(buildIndexKey('bayesianAverage')).between(bounds.lower, bounds.upper, true, true);
                break;
            default:
                collection = db.comments.where(buildIndexKey('publishedDate')).between(bounds.lower, bounds.upper, true, true);
                logger.warn(`Unknown sortBy: '${sortBy}', defaulting to 'date'.`);
                break;
        }
        logger.end(`${label} querySetup`);

        if (sortOrder === 'desc' && !['random', 'length', 'author'].includes(sortBy)) {
            collection = collection.reverse();
        }

        logger.start(`${label} toArray`);
        let pagedComments = await collection.offset(offset).limit(pageSize).toArray();
        logger.end(`${label} toArray`);

        if (sortBy === 'author') {
            pagedComments.sort((a, b) => {
                const result = a.author.localeCompare(b.author);
                return sortOrder === 'asc' ? result : -result;
            });
        }

        if (sortBy === 'length' || sortBy === 'random') {
            logger.warn(`Sorting by ${sortBy} requires full table scan. Loading all top-level comments for ${videoId}.`);
            logger.start(`${label} fullScan`);

            const allTopLevel = await db.comments
                .where(buildIndexKey('publishedDate'))
                .between(bounds.lower, bounds.upper, true, true)
                .toArray();

            if (sortBy === 'length') {
                allTopLevel.sort((a, b) => {
                    const diff = (a.content?.length || 0) - (b.content?.length || 0);
                    return sortOrder === 'asc' ? diff : -diff;
                });
            } else {
                allTopLevel.sort(() => Math.random() - 0.5);
            }

            logger.end(`${label} fullScan`);
            logger.end(label);
            return allTopLevel.slice(offset, offset + pageSize);
        }

        logger.success(`Successfully loaded ${pagedComments.length} top-level comments for page ${page}`);
        logger.end(label);
        return pagedComments;
    } catch (error) {
        logger.error('Error loading paged comments:', error);
        logger.end(label);
        return [];
    }
};

/**
 * Counts total comments for a video (already efficient)
 */
export const countComments = async (
    videoId: string,
    options: { topLevelOnly?: boolean } = {}
): Promise<number> => {
    try {
        if (options.topLevelOnly) {
            return await db.comments
                .where('[videoId+replyLevel]')
                .between([videoId, 0], [videoId, 0], true, true)
                .count();
        } else {
            return await db.comments.where('videoId').equals(videoId).count();
        }
    } catch (error) {
        logger.error('Error counting comments:', error);
        return 0;
    }
};

export const fetchRepliesForComment = async (videoId: string, parentId: string): Promise<Comment[]> => {
    logger.start(`[fetchRepliesForComment] Fetching replies for parent: ${parentId}`);

    try {
        // Direct query to get replies - this is the one that's working
        const replies = await db.comments
            .where('videoId')
            .equals(videoId)
            .and(item => {
                // Simple, straightforward conditions
                const isReplyLevel1 = item.replyLevel === 1;
                const hasMatchingParent = item.commentParentId === parentId;
                return isReplyLevel1 && hasMatchingParent;
            })
            .toArray();

        logger.info(`[fetchRepliesForComment] Found ${replies.length} replies for parent: ${parentId}`);

        if (replies.length > 0) {
            logger.success(`[fetchRepliesForComment] Successfully retrieved replies for comment: ${parentId}`);
        } else {
            const parentComment = await db.comments.where('commentId').equals(parentId).first();
            const expectedReplies = parentComment?.replyCount || 0;

            if (expectedReplies > 0) {
                logger.warn(`[fetchRepliesForComment] No replies found, but expected: ${expectedReplies}`);
            }
        }

        return replies;
    } catch (err) {
        logger.error(`[fetchRepliesForComment] Failed to fetch replies for ${parentId}:`, err);
        return [];
    } finally {
        logger.end(`[fetchRepliesForComment] Fetching replies for parent: ${parentId}`);
    }
};
