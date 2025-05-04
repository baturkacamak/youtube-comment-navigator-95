// src/features/comments/services/pagination.ts
import { db } from "../../shared/utils/database/database";
import { Comment } from "../../../types/commentTypes";
import Dexie from 'dexie';
import { PAGINATION } from "../../shared/utils/appConstants.ts";
import logger from "../../shared/utils/logger";

/**
 * Loads a page of comments from IndexedDB with sorting and filtering,
 * leveraging compound indexes for efficiency where possible.
 */
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
        let collection: Dexie.Collection<Comment, number>;

        const lowerBound = [videoId, Dexie.minKey];
        const upperBound = [videoId, Dexie.maxKey];

        logger.start(`${label} querySetup`);
        switch (sortBy) {
            case 'date':
                collection = db.comments.where('[videoId+publishedDate]').between(lowerBound, upperBound, true, true);
                break;
            case 'likes':
                collection = db.comments.where('[videoId+likes]').between(lowerBound, upperBound, true, true);
                break;
            case 'replies':
                collection = db.comments.where('[videoId+replyCount]').between(lowerBound, upperBound, true, true);
                break;
            case 'author':
                collection = db.comments.where('[videoId+author]').between(lowerBound, upperBound, true, true);
                break;
            case 'normalized':
                collection = db.comments.where('[videoId+normalizedScore]').between(lowerBound, upperBound, true, true);
                break;
            case 'zscore':
                collection = db.comments.where('[videoId+weightedZScore]').between(lowerBound, upperBound, true, true);
                break;
            case 'bayesian':
                collection = db.comments.where('[videoId+bayesianAverage]').between(lowerBound, upperBound, true, true);
                break;
            default:
                collection = db.comments.where('[videoId+publishedDate]').between(lowerBound, upperBound, true, true);
                logger.warn(`Unknown sortBy: '${sortBy}', defaulting to 'date' index.`);
                break;
        }
        logger.end(`${label} querySetup`);

        if (sortOrder === 'desc' && !['random', 'length', 'author'].includes(sortBy)) {
            collection = collection.reverse();
        }

        collection = collection.offset(offset).limit(pageSize);
        logger.start(`${label} toArray`);
        let pagedComments = await collection.toArray();
        logger.end(`${label} toArray`);

        if (sortBy === 'author') {
            pagedComments.sort((a, b) => {
                const result = a.author.localeCompare(b.author);
                return sortOrder === 'asc' ? result : -result;
            });
        }

        if (sortBy === 'length') {
            logger.warn("Sorting by length requires loading all comments for the video into memory first.");
            try {
                logger.start(`${label} loadLengthSort`);
                const allComments = await db.comments.where('videoId').equals(videoId).toArray();
                allComments.sort((a, b) => {
                    const lenA = a.content?.length || 0;
                    const lenB = b.content?.length || 0;
                    const result = lenA - lenB;
                    return sortOrder === 'asc' ? result : -result;
                });
                pagedComments = allComments.slice(offset, offset + pageSize);
                logger.end(`${label} loadLengthSort`);
            } catch (e) {
                logger.error('Failed to sort by length:', e);
                logger.end(`${label} loadLengthSort`);
                logger.end(label);
                return [];
            }
        }

        if (sortBy === 'random') {
            logger.warn("Sorting by random requires loading all comments for the video into memory first.");
            try {
                logger.start(`${label} loadRandomSort`);
                const allComments = await db.comments.where('videoId').equals(videoId).toArray();
                allComments.sort(() => Math.random() - 0.5);
                pagedComments = allComments.slice(offset, offset + pageSize);
                logger.end(`${label} loadRandomSort`);
            } catch (e) {
                logger.error('Failed to sort by random:', e);
                logger.end(`${label} loadRandomSort`);
                logger.end(label);
                return [];
            }
        }

        logger.success(`Successfully loaded ${pagedComments.length} comments for page ${page} (Sorted by ${sortBy} ${sortOrder})`);
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
export const countComments = async (videoId: string): Promise<number> => {
    try {
        return await db.comments.where('videoId').equals(videoId).count();
    } catch (error) {
        logger.error('Error counting comments:', error);
        return 0;
    }
};
