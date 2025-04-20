import { db } from "../../shared/utils/database/database";
import { Comment } from "../../../types/commentTypes";
import { extractYouTubeVideoIdFromUrl } from "../../shared/utils/extractYouTubeVideoIdFromUrl";
import { normalizeString } from "../../shared/utils/normalizeString";
import Fuse from "fuse.js";

export class CommentService {
    private static getCurrentVideoId(): string {
        return extractYouTubeVideoIdFromUrl();
    }

    static async getTotalCommentCount(): Promise<number> {
        const videoId = this.getCurrentVideoId();
        return await db.getCommentCount(videoId);
    }

    static async getCommentsWithRepliesByPage(page: number, pageSize: number = 10): Promise<Comment[]> {
        const videoId = this.getCurrentVideoId();

        const parentComments = await db.getCommentsByPage(videoId, page, pageSize);

        if (parentComments.length === 0) {
            return [];
        }

        const parentCommentIds = parentComments.map(comment => comment.commentId);

        const replies = await db.getCommentReplies(parentCommentIds);

        return [...parentComments, ...replies];
    }

    static async getFilteredComments(
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
        const videoId = this.getCurrentVideoId();
        return await db.getFilteredComments(videoId, filters, page, pageSize);
    }

    static async getAdvancedFilteredComments(
        filters: {
            likesThreshold?: { min: number, max: number | string },
            repliesLimit?: { min: number, max: number | string },
            wordCount?: { min: number, max: number | string },
            dateTimeRange?: { start: string, end: string }
        },
        page: number = 0,
        pageSize: number = 10
    ): Promise<Comment[]> {
        const videoId = this.getCurrentVideoId();
        return await db.getAdvancedFilteredComments(videoId, filters, page, pageSize);
    }

    static async getSortedComments(
        sortBy: string,
        sortOrder: 'asc' | 'desc' = 'desc',
        page: number = 0,
        pageSize: number = 10
    ): Promise<Comment[]> {
        const videoId = this.getCurrentVideoId();
        return await db.getSortedComments(videoId, sortBy, sortOrder, page, pageSize);
    }

    static async getFilteredAndSortedComments(
        basicFilters: {
            hasTimestamp?: boolean,
            isHearted?: boolean,
            hasLinks?: boolean,
            isMember?: boolean,
            isDonated?: boolean,
            isAuthorContentCreator?: boolean
        },
        advancedFilters: {
            likesThreshold?: { min: number, max: number | string },
            repliesLimit?: { min: number, max: number | string },
            wordCount?: { min: number, max: number | string },
            dateTimeRange?: { start: string, end: string }
        },
        sortBy: string,
        sortOrder: 'asc' | 'desc' = 'desc',
        page: number = 0,
        pageSize: number = 10
    ): Promise<Comment[]> {
        const videoId = this.getCurrentVideoId();

        let query = db.comments.where('videoId').equals(videoId);

        const filteredComments = await query.filter(comment => {
            if (basicFilters.hasTimestamp && !comment.hasTimestamp) return false;
            if (basicFilters.isHearted && !comment.isHearted) return false;
            if (basicFilters.hasLinks && !comment.hasLinks) return false;
            if (basicFilters.isMember && !comment.isMember) return false;
            if (basicFilters.isDonated && !comment.isDonated) return false;
            if (basicFilters.isAuthorContentCreator && !comment.isAuthorContentCreator) return false;

            if (advancedFilters.likesThreshold) {
                const { min, max } = advancedFilters.likesThreshold;
                if (comment.likes < min) return false;
                if (max !== Infinity && max !== '' && comment.likes > max) return false;
            }

            if (advancedFilters.repliesLimit) {
                const { min, max } = advancedFilters.repliesLimit;
                if (comment.replyCount < min) return false;
                if (max !== Infinity && max !== '' && comment.replyCount > max) return false;
            }

            if (advancedFilters.wordCount) {
                const { min, max } = advancedFilters.wordCount;
                const wordCount = comment.content.split(' ').length;
                if (wordCount < min) return false;
                if (max !== Infinity && max !== '' && wordCount > max) return false;
            }

            if (advancedFilters.dateTimeRange) {
                const { start, end } = advancedFilters.dateTimeRange;
                const commentDate = new Date(comment.publishedDate);

                if (start && new Date(start) > commentDate) return false;
                if (end && new Date(end) < commentDate) return false;
            }

            return true;
        }).toArray();

        let sortedComments = [...filteredComments];

        sortedComments.sort((a, b) => {
            let result = 0;

            switch (sortBy) {
                case 'likes':
                    result = a.likes - b.likes;
                    break;
                case 'date':
                    result = a.publishedDate - b.publishedDate;
                    break;
                case 'replies':
                    result = a.replyCount - b.replyCount;
                    break;
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

        const parentComments = sortedComments.filter(comment => comment.replyLevel === 0);
        const commentWithReplies = new Map<string, Comment[]>();

        const paginatedParentComments = parentComments.slice(page * pageSize, (page + 1) * pageSize);
        const parentIds = paginatedParentComments.map(comment => comment.commentId);

        const replies = sortedComments.filter(comment =>
            comment.commentParentId && parentIds.includes(comment.commentParentId)
        );

        return [...paginatedParentComments, ...replies];
    }

    static async searchComments(searchTerm: string, page: number = 0, pageSize: number = 10): Promise<Comment[]> {
        if (!searchTerm || searchTerm.trim() === '') {
            return this.getCommentsWithRepliesByPage(page, pageSize);
        }

        const videoId = this.getCurrentVideoId();

        const allComments = await db.comments.where('videoId').equals(videoId).toArray();

        const normalizedSearchTerm = normalizeString(searchTerm);
        const fuseOptions = {
            keys: ['content', 'author'],
            includeScore: true,
            threshold: 0.4,
            ignoreLocation: true,
        };

        const fuse = new Fuse(allComments, fuseOptions);
        const searchResults = fuse.search(normalizedSearchTerm);

        const matchedCommentIds = new Set<string>();
        const parentCommentIds = new Set<string>();

        searchResults.forEach(({item}) => {
            matchedCommentIds.add(item.commentId);

            if (item.replyLevel > 0 && item.commentParentId) {
                parentCommentIds.add(item.commentParentId);
            } else {
                parentCommentIds.add(item.commentId);
            }
        });

        const results: Comment[] = [];

        const parentComments = allComments.filter(comment =>
            comment.replyLevel === 0 &&
            (matchedCommentIds.has(comment.commentId) || parentCommentIds.has(comment.commentId))
        );

        const paginatedParents = parentComments.slice(page * pageSize, (page + 1) * pageSize);
        results.push(...paginatedParents);

        for (const parent of paginatedParents) {
            const replies = allComments.filter(comment =>
                comment.commentParentId === parent.commentId
            );
            results.push(...replies);
        }

        return results;
    }

    static async getBookmarkedComments(): Promise<Comment[]> {
        return await db.getBookmarkedComments();
    }

    static async toggleBookmark(comment: Comment): Promise<boolean> {
        if (!comment || !comment.id) return false;

        const isCurrentlyBookmarked = !!comment.bookmarkAddedDate && comment.bookmarkAddedDate !== '';

        const update = isCurrentlyBookmarked
            ? { bookmarkAddedDate: '', isBookmarked: false }
            : { bookmarkAddedDate: new Date().toISOString(), isBookmarked: true };

        const updateResult = await db.comments.update(comment.id, update);

        if (!isCurrentlyBookmarked) {
            await db.addTagToComment(comment.commentId, 'bookmark');
        } else {
        }

        return updateResult > 0;
    }

    static async addNoteToComment(commentId: string, note: string): Promise<boolean> {
        const comment = await db.comments.where('commentId').equals(commentId).first();
        if (!comment || !comment.id) return false;

        const updateResult = await db.comments.update(comment.id, { note });
        return updateResult > 0;
    }

    static async clearCurrentVideoComments(): Promise<number> {
        const videoId = this.getCurrentVideoId();
        return await db.clearVideoComments(videoId);
    }
}