// src/features/comments/services/pagination.ts (New file)
import { db } from "../../shared/utils/database/database";
import { Comment } from "../../../types/commentTypes";

/**
 * Loads a page of comments from IndexedDB with sorting and filtering
 */
export const loadPagedComments = async (
    videoId: string,
    page: number = 0,
    pageSize: number = 20,
    sortBy: string = 'date',
    sortOrder: string = 'desc'
): Promise<Comment[]> => {
    try {
        console.log(`Loading page ${page} with size ${pageSize}, sorted by ${sortBy} ${sortOrder}`);

        // Start with the videoId filter
        let collection = db.comments.where('videoId').equals(videoId);

        // This is inefficient for large datasets but will work for our first pass
        // For better performance, we'd need proper indices for each sort type
        let comments = await collection.toArray();

        // Apply sorting
        switch (sortBy) {
            case 'date':
                comments.sort((a, b) => {
                    const result = a.publishedDate - b.publishedDate;
                    return sortOrder === 'asc' ? result : -result;
                });
                break;
            case 'likes':
                comments.sort((a, b) => {
                    const result = a.likes - b.likes;
                    return sortOrder === 'asc' ? result : -result;
                });
                break;
            case 'replies':
                comments.sort((a, b) => {
                    const result = a.replyCount - b.replyCount;
                    return sortOrder === 'asc' ? result : -result;
                });
                break;
            case 'length':
                comments.sort((a, b) => {
                    const result = a.content.length - b.content.length;
                    return sortOrder === 'asc' ? result : -result;
                });
                break;
            case 'author':
                comments.sort((a, b) => {
                    const result = a.author.localeCompare(b.author);
                    return sortOrder === 'asc' ? result : -result;
                });
                break;
            case 'random':
                // For random sort, we shuffle the array regardless of sortOrder
                comments = comments.sort(() => Math.random() - 0.5);
                break;
            case 'normalized':
                // Use the normalized score for sorting
                comments.sort((a, b) => {
                    const result = (a.normalizedScore || 0) - (b.normalizedScore || 0);
                    return sortOrder === 'asc' ? result : -result;
                });
                break;
            case 'zscore':
                // Use the Z-score for sorting
                comments.sort((a, b) => {
                    const result = (a.weightedZScore || 0) - (b.weightedZScore || 0);
                    return sortOrder === 'asc' ? result : -result;
                });
                break;
            case 'bayesian':
                // Use the Bayesian average for sorting
                comments.sort((a, b) => {
                    const result = (a.bayesianAverage || 0) - (b.bayesianAverage || 0);
                    return sortOrder === 'asc' ? result : -result;
                });
                break;
            default:
                comments.sort((a, b) => b.publishedDate - a.publishedDate);
        }

        // Apply pagination
        const start = page * pageSize;
        const pagedComments = comments.slice(start, start + pageSize);

        console.log(`Loaded ${pagedComments.length} comments from page ${page}`);
        return pagedComments;
    } catch (error) {
        console.error('Error loading paged comments:', error);
        return [];
    }
};

/**
 * Counts total comments for a video
 */
export const countComments = async (videoId: string): Promise<number> => {
    return db.comments.where('videoId').equals(videoId).count();
};