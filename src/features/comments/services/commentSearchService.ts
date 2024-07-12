import { Comment } from "../../../types/commentTypes";
import {normalizeString} from "../../shared/utils/normalizeString";

export const searchComments = (comments: Comment[], keyword: string): Comment[] => {
    const normalizedKeyword = normalizeString(keyword);
    const filteredCommentsMap = new Map<string, Comment>();

    comments.forEach(comment => {
        if (normalizeString(comment.content).includes(normalizedKeyword)) {
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