// src/features/shared/utils/database/database.ts
import Dexie from 'dexie';
import { Comment } from "../../../../types/commentTypes"; // Adjust path if needed

// Keep the existing database name to preserve data
class Database extends Dexie {
    public comments: Dexie.Table<Comment, number>;

    public constructor() {
        super('youtube-comment-navigator-95'); // DO NOT CHANGE THIS NAME

        // Version 3: Original schema (as provided in the prompt)
        this.version(3).stores({
            // Example fields from original - ensure all necessary fields were here
            comments: '++id, videoId, author, likes, publishedDate, replyCount, wordCount, normalizedScore, weightedZScore, bayesianAverage, isBookmarked, bookmarkAddedDate, commentId'
        });

        // Version 4: Add compound indexes for efficient pagination & sorting
        this.version(4).stores({
            comments: `
                ++id,
                commentId,
                videoId,
                author,
                likes,
                publishedDate,
                replyCount,
                wordCount,
                normalizedScore,
                weightedZScore,
                bayesianAverage,
                isBookmarked,
                bookmarkAddedDate,
                replyLevel,
                commentParentId,
                authorThumb,
                authorUrl,
                content,
                isOwner,
                isPinned,
                &commentId,
                [videoId+publishedDate],
                [videoId+likes],
                [videoId+replyCount],
                [videoId+author],
                [videoId+normalizedScore],
                [videoId+weightedZScore],
                [videoId+bayesianAverage],
                [videoId+isBookmarked]` // Index for filtering bookmarks per video
        }).upgrade(async tx => {
            console.log("Upgrading database to version 4, adding compound indexes.");
            const count = await tx.table('comments').count();
            console.log(`Database upgrade complete. ${count} comments remain.`);
        });

        // Define the table property
        this.comments = this.table('comments');
    }
}

// Export a singleton instance
export const db = new Database();