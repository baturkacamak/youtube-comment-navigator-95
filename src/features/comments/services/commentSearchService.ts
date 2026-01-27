import { Comment } from '../../../types/commentTypes';
import { normalizeString } from '../../shared/utils/normalizeString';
import Fuse from 'fuse.js';

export const searchComments = (comments: Comment[], keyword: string): Comment[] => {
  const normalizedKeyword = normalizeString(keyword);

  // Normalize comments content
  const normalizedComments = comments.map((comment) => ({
    ...comment,
    normalizedContent: normalizeString(comment.content),
  }));

  // Set up Fuse.js options
  const fuseOptions = {
    keys: ['normalizedContent'],
    includeScore: true,
    threshold: 0.2,
  };

  const fuse = new Fuse(normalizedComments, fuseOptions);
  const fuseResults = fuse.search(normalizedKeyword);

  const filteredCommentsMap = new Map<string, Comment>();

  fuseResults.forEach(({ item: comment }) => {
    filteredCommentsMap.set(comment.commentId, comment);
    if (comment.commentParentId) {
      const parentComment = comments.find((c) => c.commentId === comment.commentParentId);
      if (parentComment) {
        filteredCommentsMap.set(parentComment.commentId, {
          ...parentComment,
          showRepliesDefault: true,
        });
      }
    }
  });

  comments.forEach((comment) => {
    if (normalizeString(comment.content).includes(normalizedKeyword)) {
      filteredCommentsMap.set(comment.commentId, comment);
      if (comment.commentParentId) {
        const parentComment = comments.find((c) => c.commentId === comment.commentParentId);
        if (parentComment) {
          filteredCommentsMap.set(parentComment.commentId, {
            ...parentComment,
            showRepliesDefault: true,
          });
        }
      }
    }
  });

  const filteredComments = Array.from(filteredCommentsMap.values());
  return filteredComments.sort((a, b) => {
    if (a.commentParentId === b.commentId) {
      return 1;
    } else if (b.commentParentId === a.commentId) {
      return -1;
    } else {
      return 0;
    }
  });
};
