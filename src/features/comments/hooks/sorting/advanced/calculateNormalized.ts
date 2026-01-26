import { Comment } from '../../../../../types/commentTypes';

export interface MaxValues {
    likes: number;
    replies: number;
    wordCount: number;
}

const LIKE_WEIGHT = 0.3;
const REPLY_WEIGHT = 0.5;
const WORD_WEIGHT = 0.2;

/**
 * Calculate normalized score for a comment.
 * Use with precomputed maxValues from getMaxValues() for performance.
 */
const calculateNormalized = (comment: Comment, maxValues: MaxValues, wordCount?: number) => {
    const normalizedLikes = maxValues.likes > 0 ? comment.likes / maxValues.likes : 0;
    const normalizedReplies = maxValues.replies > 0 ? comment.replyCount / maxValues.replies : 0;
    // Use cached word count if provided
    const wc = wordCount ?? comment.wordCount ?? comment.content.split(' ').length;
    const normalizedWordCount = maxValues.wordCount > 0 ? wc / maxValues.wordCount : 0;

    return (normalizedLikes * LIKE_WEIGHT) + (normalizedReplies * REPLY_WEIGHT) + (normalizedWordCount * WORD_WEIGHT);
};

/**
 * Compute max values in a single pass.
 * O(n) complexity - should be called ONCE before sorting, not inside comparator.
 */
const getMaxValues = (comments: Comment[]): MaxValues => {
    if (comments.length === 0) {
        return { likes: 1, replies: 1, wordCount: 1 };
    }

    let maxLikes = 0;
    let maxReplies = 0;
    let maxWordCount = 0;

    for (const c of comments) {
        if (c.likes > maxLikes) maxLikes = c.likes;
        if (c.replyCount > maxReplies) maxReplies = c.replyCount;
        const wc = c.wordCount ?? c.content.split(' ').length;
        if (wc > maxWordCount) maxWordCount = wc;
    }

    return {
        likes: maxLikes || 1, // Avoid division by zero
        replies: maxReplies || 1,
        wordCount: maxWordCount || 1,
    };
};

export { calculateNormalized, getMaxValues };
