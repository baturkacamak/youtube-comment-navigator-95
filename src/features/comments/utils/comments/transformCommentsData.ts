import { Comment } from '../../../../types/commentTypes';
import convertLikesToNumber from '../formatting/convertLikesToNumber';
import convertTimeAgoToDate from '../formatting/convertTimeAgoToDate';
import { containsTimestamp } from '../../../shared/utils/timestamps';

export const transformCommentsData = (comment: any, videoId: string): Comment => {
  const payload = comment.payload?.commentEntityPayload;
  const author = payload?.author?.displayName || 'Unknown';
  const content = payload?.properties?.content?.content || 'No content';
  let viewLikes = payload?.toolbar?.likeCountNotliked || 0;
  if (viewLikes === ' ') {
    viewLikes = 0;
  }
  const likes = convertLikesToNumber(viewLikes);
  const published = payload?.properties?.publishedTime || 'Unknown';
  const publishedDate =
    published !== 'Unknown' ? convertTimeAgoToDate(published).getTime() : Date.now();
  const authorAvatarUrl = payload?.author?.avatarThumbnailUrl || 'Unknown';
  const isAuthorContentCreator = payload?.author?.isCreator || false;
  const authorChannelId = payload?.author?.channelId || 'Unknown';
  const replyCount = Number(payload?.toolbar?.replyCount) || 0;
  const commentId = payload?.properties?.commentId || 'Unknown';
  const replyLevel = payload?.properties?.replyLevel || 0;
  const authorBadgeUrl = payload?.author?.sponsorBadgeUrl || false;
  const authorMemberSince = payload?.author?.sponsorBadgeA11y || false;
  const isMember = authorBadgeUrl && authorMemberSince;
  const hasTimestamp = containsTimestamp(content);
  const hasLinks = content.includes('http');

  // Extract commentParentId if replyLevel is 1
  const commentParentId = replyLevel === 1 ? commentId.split('.')[0] : undefined;
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return {
    author,
    likes,
    viewLikes: viewLikes.toString(),
    content,
    published,
    publishedDate,
    authorAvatarUrl,
    isAuthorContentCreator,
    authorChannelId,
    replyCount,
    commentId,
    commentParentId,
    replyLevel,
    authorBadgeUrl: authorBadgeUrl || '',
    authorMemberSince: authorMemberSince || '',
    isMember,
    hasTimestamp,
    hasLinks,
    videoTitle: '',
    videoId,
    isBookmarked: false,
    bookmarkAddedDate: '',
    showRepliesDefault: false,
    note: '',
    wordCount,
    timestamp: Date.now(),
    isDonated: false,
    donationAmount: '',
    isHearted: false,
    likeAction: '',
  };
};
