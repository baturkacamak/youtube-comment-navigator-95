import React from 'react';
import CommentItem from './CommentItem';
import { CommentRepliesProps } from "../../../../types/commentTypes";
import { useTranslation } from 'react-i18next';

const CommentReplies: React.FC<CommentRepliesProps> = ({ replies, showReplies, repliesRef, repliesHeight }) => {
    const { t } = useTranslation();

    return (
        <div
            className={`w-full overflow-hidden transition-all duration-500 ease-in-out ${showReplies ? 'animate-slide-in mt-4' : 'animate-slide-out'}`}
            style={{ maxHeight: repliesHeight }}
            ref={repliesRef}
            aria-expanded={showReplies}
            aria-label={t('Replies')}
        >
            <div className="mt-4 space-y-4">
                {replies.map(reply => (
                    <CommentItem key={reply.commentId} comment={reply} className="ml-10" aria-label={t('Reply')} />
                ))}
            </div>
        </div>
    );
};

export default CommentReplies;
