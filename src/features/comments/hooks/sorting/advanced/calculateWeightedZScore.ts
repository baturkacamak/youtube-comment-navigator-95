import { Comment } from '../../../../../types/commentTypes';

const calculateWeightedZScore = (comment: Comment, stats: any) => {
    const likeWeight = 0.3;
    const replyWeight = 0.5;
    const wordWeight = 0.2;

    const zScore = (value: number, mean: number, stdDev: number) => (value - mean) / stdDev;

    const likesZ = zScore(comment.likes, stats.likesMean, stats.likesStdDev);
    const repliesZ = zScore(comment.replyCount, stats.repliesMean, stats.repliesStdDev);
    const wordCountZ = zScore(comment.content.split(' ').length, stats.wordCountMean, stats.wordCountStdDev);

    return (likesZ * likeWeight) + (repliesZ * replyWeight) + (wordCountZ * wordWeight);
};

const getStats = (comments: Comment[]) => ({
    likesMean: comments.reduce((sum, c) => sum + c.likes, 0) / comments.length,
    likesStdDev: Math.sqrt(comments.map(c => Math.pow(c.likes - (comments.reduce((sum, c) => sum + c.likes, 0) / comments.length), 2)).reduce((a, b) => a + b) / comments.length),
    repliesMean: comments.reduce((sum, c) => sum + c.replyCount, 0) / comments.length,
    repliesStdDev: Math.sqrt(comments.map(c => Math.pow(c.replyCount - (comments.reduce((sum, c) => sum + c.replyCount, 0) / comments.length), 2)).reduce((a, b) => a + b) / comments.length),
    wordCountMean: comments.reduce((sum, c) => sum + c.content.split(' ').length, 0) / comments.length,
    wordCountStdDev: Math.sqrt(comments.map(c => Math.pow(c.content.split(' ').length - (comments.reduce((sum, c) => sum + c.content.split(' ').length, 0) / comments.length), 2)).reduce((a, b) => a + b) / comments.length)
});

export { calculateWeightedZScore, getStats };
