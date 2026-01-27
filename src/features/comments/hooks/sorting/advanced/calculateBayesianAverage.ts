import { Comment } from '../../../../../types/commentTypes';

export interface AvgValues {
    likes: number;
    replies: number;
}

const DEFAULT_M = 5;

/**
 * Calculate Bayesian average for a comment.
 * Use with precomputed avgValues from getAvgValues() for performance.
 */
const calculateBayesianAverage = (comment: Comment, avgValues: AvgValues, m = DEFAULT_M) => {
    const totalEngagement = comment.likes + comment.replyCount;
    const overallAverage = avgValues.likes + avgValues.replies;
    // wordCount is always set in transformCommentsData, default to 0 for type safety
    const totalCount = (comment.wordCount ?? 0) + m;

    return totalCount > 0 ? (totalEngagement + (m * overallAverage)) / totalCount : 0;
};

/**
 * Compute average values in a single pass.
 * O(n) complexity - should be called ONCE before sorting, not inside comparator.
 */
const getAvgValues = (comments: Comment[]): AvgValues => {
    const n = comments.length;
    if (n === 0) {
        return { likes: 0, replies: 0 };
    }

    let likesSum = 0;
    let repliesSum = 0;

    for (const c of comments) {
        likesSum += c.likes;
        repliesSum += c.replyCount;
    }

    return {
        likes: likesSum / n,
        replies: repliesSum / n,
    };
};

export { calculateBayesianAverage, getAvgValues };
