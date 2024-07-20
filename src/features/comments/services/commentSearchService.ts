import { Comment } from "../../../types/commentTypes";
import { normalizeString } from "../../shared/utils/normalizeString";
import Fuse from "fuse.js";

export const searchComments = (comments: Comment[], keyword: string): Comment[] => {
    const normalizedKeyword = normalizeString(keyword);

    // Set up Fuse.js options
    const fuseOptions = {
        keys: ['content'],
        includeScore: true,
        threshold: 0.2,
    };

    // Initialize Fuse with comments and options
    const fuse = new Fuse(comments, fuseOptions);

    // Perform the fuzzy search
    const fuseResults = fuse.search(normalizedKeyword);

    const filteredCommentsMap = new Map<string, Comment>();

    // Process Fuse.js results
    fuseResults.forEach(({ item: comment }) => {
        filteredCommentsMap.set(comment.commentId, comment);
        if (comment.commentParentId) {
            const parentComment = comments.find(c => c.commentId === comment.commentParentId);
            if (parentComment) {
                filteredCommentsMap.set(parentComment.commentId, {
                    ...parentComment,
                    showRepliesDefault: true
                });
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
