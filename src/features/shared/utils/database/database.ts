import Dexie from 'dexie';
import { Comment } from "../../../../types/commentTypes";

const DB_VERSION = 4;
const DB_NAME = 'youtube-comment-navigator-95';

class YouTubeCommentsDatabase extends Dexie {
    public comments: Dexie.Table<Comment, number>;

    public constructor() {
        super(DB_NAME);
        this.version(DB_VERSION).stores({
            comments: '++id, videoId, commentId, *tags, [videoId+commentId], publishedDate, likes, replyCount, wordCount, normalizedScore, weightedZScore, bayesianAverage, isBookmarked, bookmarkAddedDate, author, hasTimestamp, hasLinks, isHearted, isDonated, isAuthorContentCreator, isMember, replyLevel, commentParentId'
        });
        this.comments = this.table('comments');
    }

    async getCommentCount(videoId: string): Promise<number> {
        return this.comments.where('videoId').equals(videoId).count();
    }

    async getCommentsByPage(videoId: string, page: number, pageSize: number = 10): Promise<Comment[]> {
        return this.comments
            .where('videoId')
            .equals(videoId)
            .and(item => item.replyLevel === 0)
            .offset(page * pageSize)
            .limit(pageSize)
            .toArray();
    }

    async getCommentReplies(parentCommentIds: string[]): Promise<Comment[]> {
        if (parentCommentIds.length === 0) return [];

        return this.comments
            .where('commentParentId')
            .anyOf(parentCommentIds)
            .toArray();
    }

    async getFilteredComments(
        videoId: string,
        filters: {
            hasTimestamp?: boolean,
            isHearted?: boolean,
            hasLinks?: boolean,
            isMember?: boolean,
            isDonated?: boolean,
            isAuthorContentCreator?: boolean
        },
        page: number = 0,
        pageSize: number = 10
    ): Promise<Comment[]> {
        let query = this.comments.where('videoId').equals(videoId);

        return query
            .filter(comment => {
                if (filters.hasTimestamp && !comment.hasTimestamp) return false;
                if (filters.isHearted && !comment.isHearted) return false;
                if (filters.hasLinks && !comment.hasLinks) return false;
                if (filters.isMember && !comment.isMember) return false;
                if (filters.isDonated && !comment.isDonated) return false;
                if (filters.isAuthorContentCreator && !comment.isAuthorContentCreator) return false;
                return true;
            })
            .offset(page * pageSize)
            .limit(pageSize)
            .toArray();
    }

    async searchComments(videoId: string, searchTerm: string, page: number = 0, pageSize: number = 10): Promise<Comment[]> {
        const lowerSearchTerm = searchTerm.toLowerCase();

        return this.comments
            .where('videoId')
            .equals(videoId)
            .filter(comment =>
                comment.content.toLowerCase().includes(lowerSearchTerm) ||
                comment.author.toLowerCase().includes(lowerSearchTerm)
            )
            .offset(page * pageSize)
            .limit(pageSize)
            .toArray();
    }

    async getSortedComments(
        videoId: string,
        sortBy: string,
        sortOrder: 'asc' | 'desc' = 'desc',
        page: number = 0,
        pageSize: number = 10
    ): Promise<Comment[]> {
        let collection = this.comments.where('videoId').equals(videoId);
        let sortedComments: Comment[] = [];

        switch (sortBy) {
            case 'likes':
                sortedComments = await collection
                    .sortBy(sortOrder === 'asc' ? 'likes' : ':likes');
                break;
            case 'date':
                sortedComments = await collection
                    .sortBy(sortOrder === 'asc' ? 'publishedDate' : ':publishedDate');
                break;
            case 'replies':
                sortedComments = await collection
                    .sortBy(sortOrder === 'asc' ? 'replyCount' : ':replyCount');
                break;
            default:
                const allComments = await collection.toArray();

                sortedComments = allComments.sort((a, b) => {
                    let result = 0;

                    switch (sortBy) {
                        case 'length':
                            result = a.content.length - b.content.length;
                            break;
                        case 'author':
                            result = a.author.localeCompare(b.author);
                            break;
                        case 'random':
                            return Math.random() - 0.5;
                        case 'normalized':
                            result = (a.normalizedScore || 0) - (b.normalizedScore || 0);
                            break;
                        case 'zscore':
                            result = (a.weightedZScore || 0) - (b.weightedZScore || 0);
                            break;
                        case 'bayesian':
                            result = (a.bayesianAverage || 0) - (b.bayesianAverage || 0);
                            break;
                        default:
                            return 0;
                    }

                    return sortOrder === 'asc' ? result : -result;
                });
        }

        return sortedComments.slice(page * pageSize, (page + 1) * pageSize);
    }

    async clearVideoComments(videoId: string): Promise<number> {
        return await this.comments.where('videoId').equals(videoId).delete();
    }

    async getBookmarkedComments(): Promise<Comment[]> {
        return await this.comments
            .where('bookmarkAddedDate')
            .above('')
            .toArray();
    }

    async getAdvancedFilteredComments(
        videoId: string,
        filters: {
            likesThreshold?: { min: number, max: number | string },
            repliesLimit?: { min: number, max: number | string },
            wordCount?: { min: number, max: number | string },
            dateTimeRange?: { start: string, end: string }
        },
        page: number = 0,
        pageSize: number = 10
    ): Promise<Comment[]> {
        let query = this.comments.where('videoId').equals(videoId);

        return query
            .filter(comment => {
                if (filters.likesThreshold) {
                    const {min, max} = filters.likesThreshold;
                    if (comment.likes < min) return false;
                    if (max !== Infinity && max !== '' && comment.likes > max) return false;
                }

                if (filters.repliesLimit) {
                    const {min, max} = filters.repliesLimit;
                    if (comment.replyCount < min) return false;
                    if (max !== Infinity && max !== '' && comment.replyCount > max) return false;
                }

                if (filters.wordCount) {
                    const {min, max} = filters.wordCount;
                    const wordCount = comment.content.split(' ').length;
                    if (wordCount < min) return false;
                    if (max !== Infinity && max !== '' && wordCount > max) return false;
                }

                if (filters.dateTimeRange) {
                    const {start, end} = filters.dateTimeRange;
                    const commentDate = new Date(comment.publishedDate);

                    if (start && new Date(start) > commentDate) return false;
                    if (end && new Date(end) < commentDate) return false;
                }

                return true;
            })
            .offset(page * pageSize)
            .limit(pageSize)
            .toArray();
    }

    async addTagToComment(commentId: string, tag: string): Promise<number> {
        const comment = await this.comments.where('commentId').equals(commentId).first();
        if (!comment) return 0;

        const tags = comment.tags || [];
        if (!tags.includes(tag)) {
            tags.push(tag);
            return this.comments.update(comment.id as number, {tags});
        }

        return 0;
    }

    async getCommentsByTag(tag: string): Promise<Comment[]> {
        return this.comments
            .where('tags')
            .equals(tag)
            .toArray();
    }
}

export const db = new YouTubeCommentsDatabase();

const MIGRATION_FLAG = 'bookmarksMigrationCompleted';

export const migrateBookmarks = async () => {
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

    try {
        if (localStorage.getItem(MIGRATION_FLAG)) {
            return;
        }

        const oldDb = new OldDatabase();
        await oldDb.open();

        const oldBookmarks = await oldDb.comments.where('key').equals('bookmarks').first();

        if (oldBookmarks && oldBookmarks.data) {
            const bookmarksData = oldBookmarks.data;

            const newBookmarks = bookmarksData.map((bookmark: any) => ({
                ...bookmark,
                isBookmarked: true,
                bookmarkAddedDate: bookmark.bookmarkAddedDate || new Date().toISOString(),
                tags: ['bookmark']
            }));

            await db.comments.bulkPut(newBookmarks);
        }

        localStorage.setItem(MIGRATION_FLAG, 'true');

        oldDb.close();
    } catch (error) {
        console.error('Migration error:', error);
    }
};

migrateBookmarks();