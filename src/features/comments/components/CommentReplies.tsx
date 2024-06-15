import React from 'react';
import CommentItem from './CommentItem';
import { CommentRepliesProps } from "../../../types/commentTypes";
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
                {replies.map((reply, index) => (
                    <CommentItem
                        key={`${reply.commentId}-${index}`}
                        comment={reply}
                        className="ml-10"
                        bgColor={index % 2 === 0 ? 'bg-teal-100' : 'bg-teal-200'}
                        darkBgColor={index % 2 === 0 ? 'dark:bg-teal-700' : 'dark:bg-teal-900'}
                        borderColor="border-gray-300"
                        darkBorderColor="dark:border-gray-600"
                        aria-label={t('Reply')}
                    />
                ))}
            </div>
        </div>
    );
};

export default CommentReplies;
