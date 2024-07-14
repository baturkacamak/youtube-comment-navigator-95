import React, { useMemo } from 'react';
import CommentItem from './CommentItem';
import { CommentRepliesProps } from "../../../types/commentTypes";
import { useTranslation } from 'react-i18next';

const CommentReplies: React.FC<CommentRepliesProps> = ({ replies, showReplies, repliesRef, repliesHeight }) => {
    const { t } = useTranslation();

    const memoizedReplies = useMemo(() => {
        return (
            <div className="mt-4 space-y-4">
                {replies.map((reply, index) => (
                    <CommentItem
                        key={`${reply.commentId}-${index}`}
                        comment={reply}
                        className="ml-10"
                        bgColor={index % 2 === 0 ? 'bg-neutral-100' : 'bg-gray-100'}
                        darkBgColor={index % 2 === 0 ? 'dark:bg-teal-700' : 'dark:bg-teal-900'}
                        borderColor="border-gray-300"
                        darkBorderColor="dark:border-gray-600"
                        aria-label={t('Reply')}
                    />
                ))}
            </div>
        );
    }, [replies]);

    return (
        <div
            className={`w-full overflow-hidden transition-all duration-500 ease-in-out ${showReplies ? 'animate-slide-in mt-4' : 'animate-slide-out'}`}
            style={{ maxHeight: showReplies ? repliesHeight : '0px' }}
            ref={repliesRef}
            aria-expanded={showReplies}
            aria-label={t('Replies')}
        >
            {showReplies && memoizedReplies}
        </div>
    );
};

export default CommentReplies;
