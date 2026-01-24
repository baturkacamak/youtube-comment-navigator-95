import Dexie, { Table } from 'dexie';
import { Comment } from "../../../../types/commentTypes";
import logger from "../logger";

class Database extends Dexie {
    public comments!: Table<Comment, number>;
    public kvStore!: Table<{ key: string; value: any }, string>;

    constructor() {
        super('youtube-comment-navigator-95');

        try {
            logger.info('[Dexie] Initializing IndexedDB...');

            this.version(3).stores({
                comments: '++id, videoId, author, likes, publishedDate, replyCount, wordCount, normalizedScore, weightedZScore, bayesianAverage, isBookmarked, bookmarkAddedDate, commentId'
            });

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
                    [videoId+publishedDate],
                    [videoId+likes],
                    [videoId+replyCount],
                    [videoId+author],
                    [videoId+normalizedScore],
                    [videoId+weightedZScore],
                    [videoId+bayesianAverage],
                    [videoId+isBookmarked],
                    [videoId+replyLevel],
                    [videoId+replyLevel+commentParentId],
                    [videoId+replyLevel+publishedDate],
                    [videoId+replyLevel+likes],
                    [videoId+replyLevel+replyCount],
                    [videoId+replyLevel+wordCount],
                    [videoId+replyLevel+normalizedScore],
                    [videoId+replyLevel+weightedZScore],
                    [videoId+replyLevel+bayesianAverage]
                `
            }).upgrade(async tx => {
                const count = await tx.table('comments').count();
                logger.info(`[Dexie] Upgraded to version 4. Comment count: ${count}`);
            });

            this.version(5).stores({
                kvStore: 'key'
            });

            this.version(6).stores({
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
                    isLiveChat,
                    [videoId+publishedDate],
                    [videoId+likes],
                    [videoId+replyCount],
                    [videoId+author],
                    [videoId+normalizedScore],
                    [videoId+weightedZScore],
                    [videoId+bayesianAverage],
                    [videoId+isBookmarked],
                    [videoId+replyLevel],
                    [videoId+replyLevel+commentParentId],
                    [videoId+replyLevel+publishedDate],
                    [videoId+replyLevel+likes],
                    [videoId+replyLevel+replyCount],
                    [videoId+replyLevel+wordCount],
                    [videoId+replyLevel+normalizedScore],
                    [videoId+replyLevel+weightedZScore],
                    [videoId+replyLevel+bayesianAverage],
                    [videoId+isLiveChat]
                `
            });

            this.comments = this.table('comments');
            this.kvStore = this.table('kvStore');
            logger.success('[Dexie] IndexedDB initialized and table "comments" is ready.');
        } catch (err: any) {
            logger.error('[Dexie] Failed to initialize IndexedDB:', err);
        }
    }

    async setItem(key: string, value: any): Promise<void> {
        await this.kvStore.put({ key, value });
    }

    async getItem<T>(key: string): Promise<T | null> {
        const result = await this.kvStore.get(key);
        return result ? result.value : null;
    }

    async removeItem(key: string): Promise<void> {
        await this.kvStore.delete(key);
    }
}

export const db = new Database();