import type { Comment } from '../../../types/commentTypes';
import type { SavedCommentSnapshot } from '../types';

const DEFAULT_SEEN_LIMIT = 40;
const DEFAULT_SAVED_LIMIT = 200;

export const sortCommentsNewestFirst = (comments: Comment[]): Comment[] =>
  [...comments].sort((left, right) => {
    const leftTime = Number(left.publishedDate || left.timestamp || 0);
    const rightTime = Number(right.publishedDate || right.timestamp || 0);
    return rightTime - leftTime;
  });

export const pickTopLevelNewestComments = (
  comments: Comment[],
  limit: number = DEFAULT_SEEN_LIMIT
) =>
  sortCommentsNewestFirst(comments)
    .filter((comment) => comment.replyLevel === 0 && Boolean(comment.commentId))
    .slice(0, limit);

export const diffNewComments = (
  previousCommentIds: string[],
  currentComments: Comment[],
  limit: number = DEFAULT_SEEN_LIMIT
) => {
  const newestComments = pickTopLevelNewestComments(currentComments, limit);
  const previousIds = new Set(previousCommentIds);
  const newComments = newestComments.filter((comment) => !previousIds.has(comment.commentId));

  return {
    newestComments,
    newComments,
    nextSeenCommentIds: newestComments.map((comment) => comment.commentId).slice(0, limit),
  };
};

export const mergeSavedCommentSnapshots = (
  savedComments: SavedCommentSnapshot[],
  newComments: Comment[],
  savedLimit: number = DEFAULT_SAVED_LIMIT
): SavedCommentSnapshot[] => {
  const knownIds = new Set(savedComments.map((comment) => comment.commentId));
  const appended = newComments
    .filter((comment) => !knownIds.has(comment.commentId))
    .map((comment) => ({
      commentId: comment.commentId,
      author: comment.author,
      content: comment.content,
      published: comment.published,
      detectedAt: Date.now(),
    }));

  return [...savedComments, ...appended].slice(-savedLimit);
};
