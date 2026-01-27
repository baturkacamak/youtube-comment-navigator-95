import { Comment } from '../../../../../types/commentTypes';

const sortByReplies = (a: Comment, b: Comment, sortOrder: string) => {
  return sortOrder === 'asc' ? a.replyCount - b.replyCount : b.replyCount - a.replyCount;
};

export default sortByReplies;
