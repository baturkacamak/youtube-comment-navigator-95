import Dexie from 'dexie';
import { Comment } from "../../../../types/commentTypes";

// Define the old database
class OldDatabase extends Dexie {
    public comments: Dexie.Table<any, string>;

    public constructor() {
        super('commentsCacheDB');
        this.version(1).stores({
            comments: 'key'
        });
        this.comments = this.table('comments');
    }
}

// Define the new database with a new name
class NewDatabase extends Dexie {
    public comments: Dexie.Table<Comment, number>;

    public constructor() {
        super('newCommentsCacheDB'); // New database name
        this.version(3).stores({
            comments: '++id, videoId, author, likes, publishedDate, replyCount, wordCount, normalizedScore, weightedZScore, bayesianAverage, isBookmarked, bookmarkAddedDate, commentId'
        });
        this.comments = this.table('comments');
    }
}

export const db = new NewDatabase();

const migrateBookmarks = async () => {
    const oldDb = new OldDatabase();
    const newDb = new NewDatabase();

    try {
        // Open the old database
        await oldDb.open();

        // Fetch all bookmarks from the old database
        const oldBookmarks = await oldDb.comments.where('key').equals('bookmarks').first();

        if (oldBookmarks && oldBookmarks.data) {
            const bookmarksData = oldBookmarks.data;

            // Transform the old bookmark structure to the new one
            const newBookmarks = bookmarksData.map((bookmark: any) => ({
                ...bookmark,
                isBookmarked: true,
                bookmarkAddedDate: new Date().toISOString(),
            }));

            // Open the new database
            await newDb.open();

            // Store the transformed bookmarks in the new database
            await newDb.comments.bulkPut(newBookmarks);

            console.log('Bookmarks migrated successfully');
        } else {
            console.log('No bookmarks found to migrate');
        }

        // Remove old cached comments
        const cachedCommentKeys = await oldDb.comments
            .where('key')
            .startsWith('cachedComments_')
            .primaryKeys();

        await oldDb.comments.bulkDelete(cachedCommentKeys);

        console.log('Old cached comments deleted successfully');

        // Close databases
        oldDb.close();
        newDb.close();
    } catch (error) {
        console.error('Error during migration:', error);
    }
};

// Run the migration
migrateBookmarks();
