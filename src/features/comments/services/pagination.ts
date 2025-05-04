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
        let collection: Dexie.Collection<Comment, number>;

        const lowerBound = [videoId, Dexie.minKey];
        const upperBound = [videoId, Dexie.maxKey];

        logger.start(`${label} querySetup`);
        switch (sortBy) {
            case 'date':
                collection = db.comments.where('[videoId+publishedDate]')
                    .between(lowerBound, upperBound, true, true);
                break;
            case 'likes':
                collection = db.comments.where('[videoId+likes]')
                    .between(lowerBound, upperBound, true, true);
                break;
            case 'replies':
                collection = db.comments.where('[videoId+replyCount]')
                    .between(lowerBound, upperBound, true, true);
                break;
            case 'author':
                collection = db.comments.where('[videoId+author]')
                    .between(lowerBound, upperBound, true, true);
                break;
            case 'normalized':
                collection = db.comments.where('[videoId+normalizedScore]')
                    .between(lowerBound, upperBound, true, true);
                break;
            case 'zscore':
                collection = db.comments.where('[videoId+weightedZScore]')
                    .between(lowerBound, upperBound, true, true);
                break;
            case 'bayesian':
                collection = db.comments.where('[videoId+bayesianAverage]')
                    .between(lowerBound, upperBound, true, true);
                break;
            default:
                collection = db.comments.where('[videoId+publishedDate]')
                    .between(lowerBound, upperBound, true, true);
                logger.warn(`Unknown sortBy: '${sortBy}', defaulting to 'date' index.`);
                break;
        }
        logger.end(`${label} querySetup`);

        if (sortOrder === 'desc' && !['random', 'length', 'author'].includes(sortBy)) {
            collection = collection.reverse();
        }

        // Filter at cursor level to keep only top-level comments
        collection = collection.and(comment => comment.replyLevel === 0);

        logger.start(`${label} toArray`);
        const pagedComments = await collection.offset(offset).limit(pageSize).toArray();
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
            const allTopLevel = await db.comments.where('videoId').equals(videoId)
                .and(c => c.replyLevel === 0)
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
export const countComments = async (videoId: string): Promise<number> => {
    try {
        return await db.comments.where('videoId').equals(videoId).count();
    } catch (error) {
        logger.error('Error counting comments:', error);
        return 0;
    }
};
