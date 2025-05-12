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
    sortOrder: string = 'desc',
    filters: any = {},
    searchKeyword: string = ''
): Promise<Comment[]> => {
    const label = `[loadPagedComments] page ${page} (${sortBy} ${sortOrder}) search: "${searchKeyword}"`;
    logger.start(label);

    try {
        logger.info(`Loading page ${page} (size ${pageSize}) for video ${videoId}, sort: ${sortBy} ${sortOrder}, filters: ${JSON.stringify(filters)}, search: "${searchKeyword}"`);

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
            case 'length':
                collection = db.comments.where(buildIndexKey('wordCount')).between(bounds.lower, bounds.upper, true, true);
                break;
            default:
                collection = db.comments.where(buildIndexKey('publishedDate')).between(bounds.lower, bounds.upper, true, true);
                logger.warn(`Unknown sortBy: '${sortBy}', defaulting to 'date'.`);
                break;
        }
        logger.end(`${label} querySetup`);

        // Apply filters using .and()
        let filteredCollection = collection;
        const activeFilters = Object.entries(filters).filter(([, value]) => value);

        if (activeFilters.length > 0 || searchKeyword) {
            logger.start(`${label} applyingFiltersAndSearch`);
            filteredCollection = collection.filter(comment => {
                let passesFilters = true;
                if (filters.timestamps) {
                    passesFilters = passesFilters && comment.hasTimestamp === true;
                }
                if (filters.heart) {
                    passesFilters = passesFilters && comment.isHearted === true;
                }
                if (filters.links) {
                    passesFilters = passesFilters && comment.hasLinks === true;
                }
                if (filters.members) {
                    passesFilters = passesFilters && comment.isMember === true;
                }
                if (filters.donated) {
                    passesFilters = passesFilters && comment.isDonated === true;
                }
                if (filters.creator) {
                    passesFilters = passesFilters && comment.isAuthorContentCreator === true;
                }

                let passesSearch = true;
                if (searchKeyword) {
                    passesSearch = comment.content?.toLowerCase().includes(searchKeyword.toLowerCase());
                }

                return passesFilters && passesSearch;
            });
            logger.end(`${label} applyingFiltersAndSearch`);
        }

        // Apply reverse *before* pagination for index-based sorts (excluding author/random)
        if (sortOrder === 'desc' && !['random', 'author'].includes(sortBy)) {
            filteredCollection = filteredCollection.reverse();
        }

        logger.start(`${label} toArray`);
        let pagedComments = await filteredCollection.offset(offset).limit(pageSize).toArray();
        logger.end(`${label} toArray`);

        if (sortBy === 'author') {
            pagedComments.sort((a, b) => {
                const result = a.author.localeCompare(b.author);
                return sortOrder === 'asc' ? result : -result;
            });
        }

        if (sortBy === 'random') {
            logger.warn(`Sorting by ${sortBy} requires full table scan. Applying search filter during scan.`);
            logger.start(`${label} fullScan`);

            let allTopLevelCollection = db.comments
                .where(buildIndexKey('publishedDate'))
                .between(bounds.lower, bounds.upper, true, true);

            allTopLevelCollection = allTopLevelCollection.filter(comment => {
                let passesFilters = true;
                if (filters.timestamps) passesFilters = passesFilters && comment.hasTimestamp === true;
                if (filters.heart) passesFilters = passesFilters && comment.isHearted === true;
                if (filters.links) passesFilters = passesFilters && comment.hasLinks === true;
                if (filters.members) passesFilters = passesFilters && comment.isMember === true;
                if (filters.donated) passesFilters = passesFilters && comment.isDonated === true;
                if (filters.creator) passesFilters = passesFilters && comment.isAuthorContentCreator === true;

                let passesSearch = true;
                if (searchKeyword) {
                    passesSearch = comment.content?.toLowerCase().includes(searchKeyword.toLowerCase());
                }
                return passesFilters && passesSearch;
            });

            let allTopLevel = await allTopLevelCollection.toArray();

            allTopLevel.sort(() => Math.random() - 0.5);

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
 * Counts total comments matching the criteria (including search)
 */
export const countComments = async (
    videoId: string,
    filters: any = {},
    searchKeyword: string = '',
    options: { topLevelOnly?: boolean } = {}
): Promise<number> => {
    const label = `[countComments] video ${videoId} search: "${searchKeyword}"`;
    logger.start(label);
    try {
        let baseCollection: Dexie.Collection<Comment, number>;

        if (options.topLevelOnly) {
            baseCollection = db.comments
                .where('[videoId+replyLevel]')
                .between([videoId, 0], [videoId, 0], true, true);
        } else {
            baseCollection = db.comments.where('videoId').equals(videoId);
        }

        // Apply filters and search
        const activeFilters = Object.entries(filters).filter(([, value]) => value);
        if (activeFilters.length > 0 || searchKeyword) {
            baseCollection = baseCollection.filter(comment => {
                let passesFilters = true;
                if (options.topLevelOnly && comment.replyLevel !== 0) return false; // Ensure top-level only if specified

                if (filters.timestamps) passesFilters = passesFilters && comment.hasTimestamp === true;
                if (filters.heart) passesFilters = passesFilters && comment.isHearted === true;
                if (filters.links) passesFilters = passesFilters && comment.hasLinks === true;
                if (filters.members) passesFilters = passesFilters && comment.isMember === true;
                if (filters.donated) passesFilters = passesFilters && comment.isDonated === true;
                if (filters.creator) passesFilters = passesFilters && comment.isAuthorContentCreator === true;

                let passesSearch = true;
                if (searchKeyword) {
                    passesSearch = comment.content?.toLowerCase().includes(searchKeyword.toLowerCase());
                }
                return passesFilters && passesSearch;
            });
        }

        const count = await baseCollection.count();
        logger.success(`Counted ${count} comments matching criteria.`);
        logger.end(label);
        return count;

    } catch (error) {
        logger.error('Error counting comments:', error);
        logger.end(label);
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
