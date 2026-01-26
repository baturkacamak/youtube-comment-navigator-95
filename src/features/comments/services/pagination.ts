// src/features/comments/services/pagination.ts
import { Comment } from "../../../types/commentTypes";
import Dexie from 'dexie';
import { PAGINATION } from "../../shared/utils/appConstants";
import logger from "../../shared/utils/logger";

// Helper function to apply filters and search keyword to a comment
const applyFiltersAndSearch = (
    comment: Comment,
    filters: any,
    searchKeyword: string,
    options: { topLevelOnly?: boolean; excludeLiveChat?: boolean; onlyLiveChat?: boolean } = {}
): boolean => {
    // Ensure top-level only if specified, this check must be first
    if (options.topLevelOnly && comment.replyLevel !== 0) return false;
    
    // Live chat filtering
    if (options.excludeLiveChat && comment.isLiveChat) return false;
    if (options.onlyLiveChat && !comment.isLiveChat) return false;

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
    searchKeyword: string = '',
    options: { topLevelOnly?: boolean; excludeLiveChat?: boolean; onlyLiveChat?: boolean } = {}
): Promise<Comment[]> => {
    const timerId = `loadPagedComments-${videoId}-p${page}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const logPrefix = `[loadPagedComments] videoId: ${videoId}, page ${page}`;
    logger.start(timerId);

    if (!videoId) {
        logger.error(`${logPrefix} - Validation Error: videoId is required.`);
        logger.end(timerId);
        return [];
    }
    if (typeof page !== 'number' || page < 0) {
        logger.error(`${logPrefix} - Validation Error: Invalid page number '${page}'. Must be a non-negative number.`);
        logger.end(timerId);
        return [];
    }
    if (typeof pageSize !== 'number' || pageSize <= 0) {
        logger.error(`${logPrefix} - Validation Error: Invalid pageSize '${pageSize}'. Must be a positive number.`);
        logger.end(timerId);
        return [];
    }

    try {
        logger.debug(`Loading page ${page} (size ${pageSize}) for video ${videoId}, sort: ${sortBy} ${sortOrder}, filters: ${JSON.stringify(filters)}, search: "${searchKeyword}"`);

        const offset = page * pageSize;
        const baseIndex = 'videoId+replyLevel';
        const buildIndexKey = (field: string) => `[${baseIndex}+${field}]`;

        const bounds = {
            lower: [videoId, 0, Dexie.minKey],
            upper: [videoId, 0, Dexie.maxKey],
        };

        const queryTimer = `${timerId}-querySetup`;
        logger.start(queryTimer);
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
                logger.warn(`${logPrefix} Unknown sortBy: '${sortBy}', defaulting to 'date'.`);
                break;
        }
        logger.end(queryTimer);

        // Apply filters using the helper function
        let filteredCollection = collection;
        const activeFilters = Object.entries(filters).filter(([, value]) => value);

        if (activeFilters.length > 0 || searchKeyword || options.excludeLiveChat || options.onlyLiveChat) {
            const filterTimer = `${timerId}-applyingFiltersAndSearch`;
            logger.start(filterTimer);
            filteredCollection = collection.filter(comment =>
                applyFiltersAndSearch(comment, filters, searchKeyword, options)
            );
            logger.end(filterTimer);
        }

        // Apply reverse *before* pagination for index-based sorts (excluding author/random)
        if (sortOrder === 'desc' && !['random', 'author'].includes(sortBy)) {
            filteredCollection = filteredCollection.reverse();
        }

        const arrayTimer = `${timerId}-toArray`;
        logger.start(arrayTimer);
        let pagedComments = await filteredCollection.offset(offset).limit(pageSize).toArray();
        logger.end(arrayTimer);

        if (sortBy === 'author') {
            pagedComments.sort((a, b) => {
                const result = a.author.localeCompare(b.author);
                return sortOrder === 'asc' ? result : -result;
            });
        }

        if (sortBy === 'random') {
            // PERF: Random sort requires loading all matching comments
            // For very large datasets (10k+), consider limiting or using reservoir sampling
            logger.warn(`${logPrefix} Random sort: loading filtered comments for shuffle.`);
            const scanTimer = `${timerId}-randomShuffle`;
            logger.start(scanTimer);

            let allTopLevelCollection = commentsTable
                .where(buildIndexKey('publishedDate'))
                .between(bounds.lower, bounds.upper, true, true);

            allTopLevelCollection = allTopLevelCollection.filter(comment =>
                applyFiltersAndSearch(comment, filters, searchKeyword)
            );

            let allTopLevel = await allTopLevelCollection.toArray();

            // Fisher-Yates shuffle (unbiased, O(n))
            // The previous Math.random()-0.5 comparator was biased and O(n log n)
            for (let i = allTopLevel.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allTopLevel[i], allTopLevel[j]] = [allTopLevel[j], allTopLevel[i]];
            }

            logger.end(scanTimer);
            const result = allTopLevel.slice(offset, offset + pageSize);
            logger.success(`${logPrefix} Shuffled ${allTopLevel.length} comments, returning page of ${result.length}.`);
            return result;
        }

        logger.debug(`${logPrefix} Successfully loaded ${pagedComments.length} top-level comments for page ${page}`);
        return pagedComments;
    } catch (error) {
        logger.error(`${logPrefix} Error loading paged comments:`, error);
        return [];
    } finally {
        logger.end(timerId);
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
    options: { topLevelOnly?: boolean; excludeLiveChat?: boolean; onlyLiveChat?: boolean } = {}
): Promise<number> => {
    const timerId = `countComments-${videoId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const logPrefix = `[countComments] video ${videoId}`;
    logger.start(timerId);

    if (!videoId) {
        logger.error(`${logPrefix} - Validation Error: videoId is required.`);
        logger.end(timerId);
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
        if (activeFilters.length > 0 || searchKeyword || options.excludeLiveChat || options.onlyLiveChat) {
             baseCollection = baseCollection.filter(comment =>
                applyFiltersAndSearch(comment, filters, searchKeyword, options)
             );
        }

        const count = await baseCollection.count();
        logger.debug(`${logPrefix} Counted ${count} comments matching criteria.`);
        return count;

    } catch (error) {
        logger.error(`${logPrefix} Error counting comments:`, error);
        return 0;
    } finally {
        logger.end(timerId);
    }
};

export const fetchRepliesForComment = async (
    commentsTable: Dexie.Table<Comment, number>,
    videoId: string,
    parentId: string
): Promise<Comment[]> => {
    const timerId = `fetchRepliesForComment-${parentId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const logPrefix = `[fetchRepliesForComment] videoId: ${videoId}, parentId: ${parentId}`;
    logger.start(timerId);

    if (!videoId) {
        logger.error(`${logPrefix} - Validation Error: videoId is required.`);
        logger.end(timerId);
        return [];
    }
    if (!parentId) {
        logger.error(`${logPrefix} - Validation Error: parentId is required.`);
        logger.end(timerId);
        return [];
    }

    try {
        logger.info(`${logPrefix} Starting to fetch replies.`);
        const replies = await commentsTable
            .where('videoId')
            .equals(videoId)
            .and(item => {
                const isReplyLevel1 = item.replyLevel === 1;
                const hasMatchingParent = item.commentParentId === parentId;
                return isReplyLevel1 && hasMatchingParent;
            })
            .toArray();

        logger.info(`${logPrefix} Found ${replies.length} replies.`);

        if (replies.length > 0) {
            logger.success(`${logPrefix} Successfully retrieved ${replies.length} replies.`);
        } else {
            const parentComment = await commentsTable.where('commentId').equals(parentId).first();
            const expectedReplies = parentComment?.replyCount || 0;

            if (expectedReplies > 0) {
                logger.warn(`${logPrefix} No replies found in DB, but parent comment (replyCount: ${expectedReplies}) indicates replies should exist.`);
            } else {
                logger.info(`${logPrefix} No replies found, and parent comment does not indicate any replies (or parent not found).`);
            }
        }
        return replies;
    } catch (err) {
        logger.error(`${logPrefix} Failed to fetch replies:`, err);
        return [];
    } finally {
        logger.end(timerId);
    }
};