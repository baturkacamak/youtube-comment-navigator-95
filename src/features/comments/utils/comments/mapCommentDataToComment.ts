// src/features/shared/utils/commentUtils.ts
import { Comment } from "../../../../types/commentTypes";

export const mapCommentDataToComment = (commentData: any, videoId: string): Comment => {
    return {
        author: commentData.author,
        likes: commentData.likes,
        viewLikes: '',
        content: commentData.content,
        published: '',
        publishedDate: commentData.publishedDate,
        authorAvatarUrl: '',
        isAuthorContentCreator: false,
        authorChannelId: '',
        replyCount: commentData.replyCount,
        commentId: commentData.commentId, // Ensure the commentId is mapped correctly
        commentParentId: '',
        replyLevel: 0,
        isDonated: false,
        donationAmount: '',
        isHearted: false,
        isMember: false,
        authorBadgeUrl: '',
        authorMemberSince: '',
        hasTimestamp: false,
        hasLinks: false,
        videoTitle: '',
        videoId: videoId,
        isBookmarked: false,
        bookmarkAddedDate: '',
        showRepliesDefault: false,
        note: '',
        wordCount: commentData.content.split(' ').length,
        normalizedScore: 0,
        weightedZScore: 0,
        bayesianAverage: 0,
        timestamp: Date.now()
    };
};
