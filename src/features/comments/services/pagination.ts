// src/features/comments/services/pagination.ts
import { Comment } from "../../../types/commentTypes";
import Dexie from 'dexie';
import { PAGINATION } from "../../shared/utils/appConstants.ts";
import logger from "../../shared/utils/logger";

// Helper function to apply filters and search keyword to a comment
const applyFiltersAndSearch = (
    comment: Comment,
    filters: any,
    searchKeyword: string,
    options: { topLevelOnly?: boolean } = {}
): boolean => {
    // Ensure top-level only if specified, this check must be first
    if (options.topLevelOnly && comment.replyLevel !== 0) return false;

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
};

export const loadPagedComments = async (
    commentsTable: Dexie.Table<Comment, number>,
    videoId: string,
    page: number = PAGINATION.INITIAL_PAGE,
    pageSize: number = PAGINATION.DEFAULT_PAGE_SIZE,
    sortBy: string = 'date',
    sortOrder: string = 'desc',
    filters: any = {},
    searchKeyword: string = ''
): Promise<Comment[]> => {
    const label = `[loadPagedComments] videoId: ${videoId}, page ${page} (${sortBy} ${sortOrder}) search: "${searchKeyword}"`;
    logger.start(label);

    if (!videoId) {
        logger.error(`${label} - Validation Error: videoId is required.`);
        logger.end(label);
        return [];
    }
    if (typeof page !== 'number' || page < 0) {
        logger.error(`${label} - Validation Error: Invalid page number '${page}'. Must be a non-negative number.`);
        logger.end(label);
        return [];
    }
    if (typeof pageSize !== 'number' || pageSize <= 0) {
        logger.error(`${label} - Validation Error: Invalid pageSize '${pageSize}'. Must be a positive number.`);
        logger.end(label);
        return [];
    }

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
                collection = commentsTable.where(buildIndexKey('publishedDate')).between(bounds.lower, bounds.upper, true, true);
                break;
            case 'likes':
                collection = commentsTable.where(buildIndexKey('likes')).between(bounds.lower, bounds.upper, true, true);
                break;
            case 'replies':
                collection = commentsTable.where(buildIndexKey('replyCount')).between(bounds.lower, bounds.upper, true, true);
                break;
            case 'author':
                collection = commentsTable.where(buildIndexKey('author')).between(bounds.lower, bounds.upper, true, true);
                break;
            case 'normalized':
                collection = commentsTable.where(buildIndexKey('normalizedScore')).between(bounds.lower, bounds.upper, true, true);
                break;
            case 'zscore':
                collection = commentsTable.where(buildIndexKey('weightedZScore')).between(bounds.lower, bounds.upper, true, true);
                break;
            case 'bayesian':
                collection = commentsTable.where(buildIndexKey('bayesianAverage')).between(bounds.lower, bounds.upper, true, true);
                break;
            case 'length':
                collection = commentsTable.where(buildIndexKey('wordCount')).between(bounds.lower, bounds.upper, true, true);
                break;
            default:
                collection = commentsTable.where(buildIndexKey('publishedDate')).between(bounds.lower, bounds.upper, true, true);
                logger.warn(`${label} Unknown sortBy: '${sortBy}', defaulting to 'date'.`);
                break;
        }
        logger.end(`${label} querySetup`);

        // Apply filters using the helper function
        let filteredCollection = collection;
        const activeFilters = Object.entries(filters).filter(([, value]) => value);

        if (activeFilters.length > 0 || searchKeyword) {
            logger.start(`${label} applyingFiltersAndSearch`);
            filteredCollection = collection.filter(comment =>
                applyFiltersAndSearch(comment, filters, searchKeyword)
            );
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
            logger.warn(`${label} Sorting by ${sortBy} requires full table scan. Applying search filter during scan.`);
            logger.start(`${label} fullScan`);

            let allTopLevelCollection = commentsTable
                .where(buildIndexKey('publishedDate'))
                .between(bounds.lower, bounds.upper, true, true);

            // Use helper function for filtering during random sort scan
            allTopLevelCollection = allTopLevelCollection.filter(comment =>
                applyFiltersAndSearch(comment, filters, searchKeyword)
            );

            let allTopLevel = await allTopLevelCollection.toArray();
            allTopLevel.sort(() => Math.random() - 0.5);
            logger.end(`${label} fullScan`);
            logger.success(`${label} Successfully loaded ${allTopLevel.slice(offset, offset + pageSize).length} comments (random sort).`);
            return allTopLevel.slice(offset, offset + pageSize);
        }

        logger.success(`${label} Successfully loaded ${pagedComments.length} top-level comments for page ${page}`);
        return pagedComments;
    } catch (error) {
        logger.error(`${label} Error loading paged comments:`, error);
        return [];
    } finally {
        logger.end(label);
    }
};

/**
 * Counts total comments matching the criteria (including search)
 */
export const countComments = async (
    commentsTable: Dexie.Table<Comment, number>,
    videoId: string,
    filters: any = {},
    searchKeyword: string = '',
    options: { topLevelOnly?: boolean } = {}
): Promise<number> => {
    const label = `[countComments] video ${videoId} search: "${searchKeyword}" options: ${JSON.stringify(options)}`;
    logger.start(label);

    if (!videoId) {
        logger.error(`${label} - Validation Error: videoId is required.`);
        logger.end(label);
        return 0;
    }

    try {
        let baseCollection: Dexie.Collection<Comment, number>;

        if (options.topLevelOnly) {
            baseCollection = commentsTable
                .where('[videoId+replyLevel]')
                .between([videoId, 0], [videoId, 0], true, true);
        } else {
            baseCollection = commentsTable.where('videoId').equals(videoId);
        }

        // Apply filters and search using the helper function
        const activeFilters = Object.entries(filters).filter(([, value]) => value);
        if (activeFilters.length > 0 || searchKeyword) {
             baseCollection = baseCollection.filter(comment =>
                applyFiltersAndSearch(comment, filters, searchKeyword, options)
             );
        }

        const count = await baseCollection.count();
        logger.success(`${label} Counted ${count} comments matching criteria.`);
        return count;

    } catch (error) {
        logger.error(`${label} Error counting comments:`, error);
        return 0;
    } finally {
        logger.end(label);
    }
};

export const fetchRepliesForComment = async (
    commentsTable: Dexie.Table<Comment, number>,
    videoId: string,
    parentId: string
): Promise<Comment[]> => {
    const label = `[fetchRepliesForComment] videoId: ${videoId}, parentId: ${parentId}`;
    logger.start(label);

    if (!videoId) {
        logger.error(`${label} - Validation Error: videoId is required.`);
        logger.end(label);
        return [];
    }
    if (!parentId) {
        logger.error(`${label} - Validation Error: parentId is required.`);
        logger.end(label);
        return [];
    }

    try {
        logger.info(`${label} Starting to fetch replies.`);
        const replies = await commentsTable
            .where('videoId')
            .equals(videoId)
            .and(item => {
                const isReplyLevel1 = item.replyLevel === 1;
                const hasMatchingParent = item.commentParentId === parentId;
                return isReplyLevel1 && hasMatchingParent;
            })
            .toArray();

        logger.info(`${label} Found ${replies.length} replies.`);

        if (replies.length > 0) {
            logger.success(`${label} Successfully retrieved ${replies.length} replies.`);
        } else {
            const parentComment = await commentsTable.where('commentId').equals(parentId).first();
            const expectedReplies = parentComment?.replyCount || 0;

            if (expectedReplies > 0) {
                logger.warn(`${label} No replies found in DB, but parent comment (replyCount: ${expectedReplies}) indicates replies should exist.`);
            } else {
                logger.info(`${label} No replies found, and parent comment does not indicate any replies (or parent not found).`);
            }
        }
        return replies;
    } catch (err) {
        logger.error(`${label} Failed to fetch replies:`, err);
        return [];
    } finally {
        logger.end(label);
    }
};
