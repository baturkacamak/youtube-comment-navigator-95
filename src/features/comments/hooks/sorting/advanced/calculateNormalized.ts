import { Comment } from '../../../../../types/commentTypes';

const calculateNormalized = (comment: Comment, maxValues: any) => {
    const likeWeight = 0.3;
    const replyWeight = 0.5;
    const wordWeight = 0.2;

    const normalizedLikes = comment.likes / maxValues.likes;
    const normalizedReplies = comment.replyCount / maxValues.replies;
    const normalizedWordCount = comment.content.split(' ').length / maxValues.wordCount;

    return (normalizedLikes * likeWeight) + (normalizedReplies * replyWeight) + (normalizedWordCount * wordWeight);
};

const getMaxValues = (comments: Comment[]) => ({
    likes: Math.max(...comments.map(c => c.likes)),
    replies: Math.max(...comments.map(c => c.replyCount)),
    wordCount: Math.max(...comments.map(c => c.content.split(' ').length))
});

export { calculateNormalized, getMaxValues };
