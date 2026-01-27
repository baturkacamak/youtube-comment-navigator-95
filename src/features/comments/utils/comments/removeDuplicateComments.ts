export const removeDuplicateComments = (comments: any[]) => {
  const seenCommentIds = new Set();
  return comments.filter((comment) => {
    if (seenCommentIds.has(comment.commentId)) {
      return false;
    }
    seenCommentIds.add(comment.commentId);
    return true;
  });
};
