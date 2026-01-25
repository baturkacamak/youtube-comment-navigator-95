import Dexie, { Table } from 'dexie';
import { Comment } from "../../../../types/commentTypes";
import { LiveChatMessage } from "../../../../types/liveChatTypes";
import logger from "../logger";

class Database extends Dexie {
    public comments!: Table<Comment, number>;
    public liveChatMessages!: Table<LiveChatMessage, number>;
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

            // Version 7: Add separate liveChatMessages table
            this.version(7).stores({
                liveChatMessages: `
                    ++id,
                    messageId,
                    videoId,
                    author,
                    authorChannelId,
                    timestampMs,
                    publishedDate,
                    videoOffsetTimeSec,
                    isDonation,
                    isMembership,
                    isModerator,
                    isBookmarked,
                    bookmarkAddedDate,
                    [videoId+timestampMs],
                    [videoId+author],
                    [videoId+isDonation],
                    [videoId+isMembership],
                    [videoId+isModerator],
                    [videoId+isBookmarked]
                `
            }).upgrade(async tx => {
                try {
                    logger.info('[Dexie] Upgrading to version 7: Adding liveChatMessages table');

                    // Migrate existing livechat from comments to liveChatMessages table
                    const liveChatComments = await tx.table('comments')
                        .where('isLiveChat')
                        .equals(1)
                        .toArray();

                    if (liveChatComments.length > 0) {
                        logger.info(`[Dexie] Migrating ${liveChatComments.length} livechat messages to new table`);

                        const liveChatMessages: LiveChatMessage[] = liveChatComments.map(comment => ({
                            messageId: comment.commentId,
                            videoId: comment.videoId || '',
                            author: comment.author,
                            authorChannelId: comment.authorChannelId,
                            authorAvatarUrl: comment.authorAvatarUrl,
                            isAuthorContentCreator: comment.isAuthorContentCreator,
                            message: comment.content,
                            timestampUsec: String(comment.publishedDate * 1000),
                            timestampMs: comment.publishedDate,
                            publishedDate: comment.publishedDate,
                            published: comment.published,
                            videoOffsetTimeSec: comment.timestamp,
                            isDonation: comment.isDonated,
                            donationAmount: comment.donationAmount,
                            isMembership: comment.isMember,
                            isBookmarked: comment.isBookmarked,
                            bookmarkAddedDate: comment.bookmarkAddedDate,
                            note: comment.note
                        }));

                        await tx.table('liveChatMessages').bulkAdd(liveChatMessages);
                        logger.success('[Dexie] Successfully migrated livechat messages');

                        // Optionally delete migrated livechat from comments table
                        // Keeping them for now in case of rollback needs
                        // await tx.table('comments').where('isLiveChat').equals(1).delete();
                    }
                } catch (error: any) {
                    logger.error('[Dexie] Error during version 7 upgrade:', error);
                    throw error;
                }
            });

            this.comments = this.table('comments');
            this.liveChatMessages = this.table('liveChatMessages');
            this.kvStore = this.table('kvStore');
            logger.success('[Dexie] IndexedDB initialized. Tables ready: comments, liveChatMessages, kvStore');
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