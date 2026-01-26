import { Comment } from '../../../../../types/commentTypes';

export interface ZScoreStats {
    likesMean: number;
    likesStdDev: number;
    repliesMean: number;
    repliesStdDev: number;
    wordCountMean: number;
    wordCountStdDev: number;
}

const LIKE_WEIGHT = 0.3;
const REPLY_WEIGHT = 0.5;
const WORD_WEIGHT = 0.2;

/**
 * Calculate weighted z-score for a comment.
 * Use with precomputed stats from getStats() for performance.
 */
const calculateWeightedZScore = (comment: Comment, stats: ZScoreStats, wordCount?: number) => {
    const zScore = (value: number, mean: number, stdDev: number) =>
        stdDev === 0 ? 0 : (value - mean) / stdDev;

    const likesZ = zScore(comment.likes, stats.likesMean, stats.likesStdDev);
    const repliesZ = zScore(comment.replyCount, stats.repliesMean, stats.repliesStdDev);
    // Use cached word count if provided, otherwise compute
    const wc = wordCount ?? comment.wordCount ?? comment.content.split(' ').length;
    const wordCountZ = zScore(wc, stats.wordCountMean, stats.wordCountStdDev);

    return (likesZ * LIKE_WEIGHT) + (repliesZ * REPLY_WEIGHT) + (wordCountZ * WORD_WEIGHT);
};

/**
 * Compute statistics for z-score calculation in a single pass.
 * O(n) complexity - should be called ONCE before sorting, not inside comparator.
 */
const getStats = (comments: Comment[]): ZScoreStats => {
    const n = comments.length;
    if (n === 0) {
        return {
            likesMean: 0, likesStdDev: 1,
            repliesMean: 0, repliesStdDev: 1,
            wordCountMean: 0, wordCountStdDev: 1,
        };
    }

    // Single pass to compute sums
    let likesSum = 0;
    let repliesSum = 0;
    let wordCountSum = 0;

    for (const c of comments) {
        likesSum += c.likes;
        repliesSum += c.replyCount;
        // Use cached wordCount if available, otherwise compute
        wordCountSum += c.wordCount ?? c.content.split(' ').length;
    }

    const likesMean = likesSum / n;
    const repliesMean = repliesSum / n;
    const wordCountMean = wordCountSum / n;

    // Second pass for standard deviation
    let likesVariance = 0;
    let repliesVariance = 0;
    let wordCountVariance = 0;

    for (const c of comments) {
        likesVariance += Math.pow(c.likes - likesMean, 2);
        repliesVariance += Math.pow(c.replyCount - repliesMean, 2);
        const wc = c.wordCount ?? c.content.split(' ').length;
        wordCountVariance += Math.pow(wc - wordCountMean, 2);
    }

    return {
        likesMean,
        likesStdDev: Math.sqrt(likesVariance / n) || 1, // Avoid division by zero
        repliesMean,
        repliesStdDev: Math.sqrt(repliesVariance / n) || 1,
        wordCountMean,
        wordCountStdDev: Math.sqrt(wordCountVariance / n) || 1,
    };
};

export { calculateWeightedZScore, getStats };
