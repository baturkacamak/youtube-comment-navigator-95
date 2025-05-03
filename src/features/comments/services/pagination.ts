// src/features/comments/services/pagination.ts
import { db } from "../../shared/utils/database/database";
import { Comment } from "../../../types/commentTypes"; // Adjust path if needed
import Dexie from 'dexie';

/**
 * Loads a page of comments from IndexedDB with sorting and filtering,
 * leveraging compound indexes for efficiency where possible.
 */
export const loadPagedComments = async (
    videoId: string,
    page: number = 0,
    pageSize: number = 20,
    sortBy: string = 'date',
    sortOrder: string = 'desc'
): Promise<Comment[]> => {
    try {
        console.log(`Loading page ${page} (size ${pageSize}) for video ${videoId}, sort: ${sortBy} ${sortOrder}`);

        const offset = page * pageSize;
        let collection: Dexie.Collection<Comment, number>;

        // --- Use .between() for compound index range queries ---
        const lowerBound = [videoId, Dexie.minKey];
        const upperBound = [videoId, Dexie.maxKey];

        // Determine the base collection using the most efficient index available
        switch (sortBy) {
            case 'date':
                collection = db.comments.where('[videoId+publishedDate]').between(lowerBound, upperBound, true, true); // true, true for inclusive bounds
                break;
            case 'likes':
                collection = db.comments.where('[videoId+likes]').between(lowerBound, upperBound, true, true);
                break;
            case 'replies':
                collection = db.comments.where('[videoId+replyCount]').between(lowerBound, upperBound, true, true);
                break;
            case 'author':
                // LocaleCompare still happens after retrieval, but index helps narrow down
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
            case 'length': // Unindexed sort - handled below
            case 'random': // Unindexed sort - handled below
            default:
                // Fallback to date sort index as a reasonable default if 'default' case hit unexpectedly
                collection = db.comments.where('[videoId+publishedDate]').between(lowerBound, upperBound, true, true);
                // If default was truly intended *and* you only need videoId filtering without sorting assistance,
                // you could use the simpler index, but compound is generally fine:
                // collection = db.comments.where('videoId').equals(videoId);
                break;
        }

        // Apply sorting direction for indexed sorts
        // NOTE: .reverse() works correctly with .between() ranges.
        if (sortOrder === 'desc' && sortBy !== 'random' && sortBy !== 'length' && sortBy !== 'author') {
            collection = collection.reverse();
        }

        // Apply pagination using IndexedDB's capabilities (efficient)
        collection = collection.offset(offset).limit(pageSize);

        // Retrieve the comments for the page
        let pagedComments = await collection.toArray();

        // --- Handle sorts that require in-memory processing after retrieval ---

        // Author sorting needs localeCompare
        if (sortBy === 'author') {
            pagedComments.sort((a, b) => {
                const result = a.author.localeCompare(b.author);
                return sortOrder === 'asc' ? result : -result;
            });
            // Note: Sorts only the retrieved page. See previous explanation.
        }

        // Length sorting cannot use an index
        if (sortBy === 'length') {
            console.warn("Sorting by length requires loading all comments for the video into memory first.");
            const allComments = await db.comments.where('videoId').equals(videoId).toArray(); // Simple filter is fine here
            allComments.sort((a, b) => {
                const lenA = a.content?.length || 0;
                const lenB = b.content?.length || 0;
                const result = lenA - lenB;
                return sortOrder === 'asc' ? result : -result;
            });
            pagedComments = allComments.slice(offset, offset + pageSize);
        }

        // Random sorting cannot use an index
        if (sortBy === 'random') {
            console.warn("Sorting by random requires loading all comments for the video into memory first.");
            const allComments = await db.comments.where('videoId').equals(videoId).toArray(); // Simple filter is fine here
            allComments.sort(() => Math.random() - 0.5);
            pagedComments = allComments.slice(offset, offset + pageSize);
        }


        console.log(`Successfully loaded ${pagedComments.length} comments for page ${page} (Sorted by ${sortBy} ${sortOrder})`);
        return pagedComments;
    } catch (error) {
        console.error('Error loading paged comments:', error);
        return [];
    }
};

/**
 * Counts total comments for a video (already efficient)
 */
export const countComments = async (videoId: string): Promise<number> => {
    try {
        // This uses the simple 'videoId' index, which is efficient for counting.
        return await db.comments.where('videoId').equals(videoId).count();
    } catch (error) {
        console.error('Error counting comments:', error);
        return 0;
    }
};