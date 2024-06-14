import {Comment} from "../../../types/commentTypes";
import convertLikesToNumber from "./convertLikesToNumber";
import timeAgoToDate from "./timeAgoToDate";

const timestampRegex = /\b(\d{1,2}):([0-5]\d)(?::([0-5]\d))?\b/;

export const transformComment = (comment: any): Comment => {
    const payload = comment.payload?.commentEntityPayload;
    const author = payload?.author?.displayName || 'Unknown';
    const content = payload?.properties?.content?.content || 'No content';
    const likes = convertLikesToNumber(payload?.toolbar?.likeCountLiked || 0);
    const published = payload?.properties?.publishedTime || 'Unknown';
    const publishedDate = published !== 'Unknown' ? timeAgoToDate(published).getTime() : Date.now();
    const authorAvatarUrl = payload?.author?.avatarThumbnailUrl || 'Unknown';
    const isAuthorContentCreator = payload?.author?.isCreator || false;
    const authorChannelId = payload?.author?.channelId || 'Unknown';
    const replyCount = Number(payload?.toolbar?.replyCount) || 0;
    const commentId = payload?.properties?.commentId || 'Unknown';
    const replyLevel = payload?.properties?.replyLevel || 0;
    const authorBadgeUrl = payload?.author?.sponsorBadgeUrl || false;
    const authorMemberSince = payload?.author?.sponsorBadgeA11y || false;
    const isMember = (authorBadgeUrl && authorMemberSince);
    const hasTimestamp = timestampRegex.test(content);
    const hasLinks = content.includes('http');

    // Extract commentParentId if replyLevel is 1
    const commentParentId = replyLevel === 1 ? commentId.split('.')[0] : undefined;

    return {
        author,
        likes,
        content,
        published,
        publishedDate,  // Store as ISO string
        authorAvatarUrl,
        isAuthorContentCreator,
        authorChannelId,
        replyCount,
        commentId,
        commentParentId,
        replyLevel,
        authorBadgeUrl,
        authorMemberSince,
        isMember,
        hasTimestamp,
        hasLinks
    };
};
