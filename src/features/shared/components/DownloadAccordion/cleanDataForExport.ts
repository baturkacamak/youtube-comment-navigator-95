import { Comment } from '../../../../types/commentTypes';

/**
 * cleaner version of the comment object for export
 * Removes internal UI state, redundant fields, and sensitive/opaque tokens
 */
export const cleanCommentForExport = (comment: any): Partial<Comment> => {
  if (!comment) return {};

  const commentCopy = { ...comment };

  const fieldsToRemove = [
    'viewLikes', // Redundant with 'likes'
    'hasTimestamp', // Derived
    'hasLinks', // Derived
    'videoTitle', // Usually redundant in context of single video export
    'videoId', // Usually redundant
    'isBookmarked', // Local user state
    'bookmarkAddedDate', // Local user state
    'showRepliesDefault', // UI state
    'note', // Local user state
    'wordCount', // Derived
    'timestamp', // Internal fetch timestamp? publishedDate is better
    'likeAction', // Opaque API token - definitely remove
    'id', // Internal DB ID
    'authorAvatarUrl', // UI specific
    'authorBadgeUrl', // UI specific
    'authorMemberSince', // UI specific
  ];

  fieldsToRemove.forEach((field) => {
    delete commentCopy[field];
  });

  return commentCopy;
};

/**
 * Clean an array of comments for export
 */
export const cleanCommentsForExport = (comments: unknown[]): unknown[] => {
  return comments.map((c) => {
    if (typeof c === 'object' && c !== null && 'content' in c) {
      return cleanCommentForExport(c);
    }
    return c;
  });
};
