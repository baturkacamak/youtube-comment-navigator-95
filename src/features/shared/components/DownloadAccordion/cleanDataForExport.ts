import { Comment } from '../../../../types/commentTypes';
import { ExportFieldPreset } from './types';

const COMMENT_EXPORT_FIELDS: Record<ExportFieldPreset, Array<keyof Partial<Comment>>> = {
  compact: ['author', 'content', 'published', 'replyLevel', 'commentParentId'],
  standard: [
    'author',
    'content',
    'published',
    'likes',
    'replyCount',
    'commentId',
    'commentParentId',
    'replyLevel',
  ],
  full: [],
};

/**
 * cleaner version of the comment object for export
 * Removes internal UI state, redundant fields, and sensitive/opaque tokens
 */
export const cleanCommentForExport = (
  comment: any,
  fieldPreset: ExportFieldPreset = 'full'
): Partial<Comment> => {
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

  if (fieldPreset !== 'full') {
    const allowedFields = new Set<string>(COMMENT_EXPORT_FIELDS[fieldPreset] as string[]);
    Object.keys(commentCopy).forEach((field) => {
      if (!allowedFields.has(field)) {
        delete commentCopy[field];
      }
    });
  }

  return commentCopy;
};

/**
 * Clean an array of comments for export
 */
export const cleanCommentsForExport = (
  comments: unknown[],
  fieldPreset: ExportFieldPreset = 'full'
): unknown[] => {
  return comments.map((c) => {
    if (typeof c === 'object' && c !== null && 'content' in c) {
      return cleanCommentForExport(c, fieldPreset);
    }
    return c;
  });
};
