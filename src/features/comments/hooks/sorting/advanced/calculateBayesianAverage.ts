import { Comment } from '../../../../../types/commentTypes';

const calculateBayesianAverage = (comment: Comment, avgValues: any, m = 5) => {
    const totalEngagement = comment.likes + comment.replyCount;
    const overallAverage = avgValues.likes + avgValues.replies;
    const totalCount = comment.content.split(' ').length + m;

    return ((totalEngagement + (m * overallAverage)) / totalCount);
};

const getAvgValues = (comments: Comment[]) => ({
    likes: comments.reduce((sum, c) => sum + c.likes, 0) / comments.length,
    replies: comments.reduce((sum, c) => sum + c.replyCount, 0) / comments.length
});

export { calculateBayesianAverage, getAvgValues };
