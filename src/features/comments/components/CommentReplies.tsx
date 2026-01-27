import React, {useMemo} from 'react';
import CommentItem from './CommentItem';
import {CommentRepliesProps} from "../../../types/commentTypes";
import {useTranslation} from 'react-i18next';

const CommentReplies: React.FC<CommentRepliesProps> = React.memo(({
                                                          replies,
                                                          showReplies,
                                                          isLoading,
                                                          parentCommentId
                                                      }) => {
    const {t} = useTranslation();

    const memoizedReplies = useMemo(() => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center p-4">
                    <svg className="animate-spin h-5 w-5 text-gray-600 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            );
        }

        if (!replies || replies.length === 0) {
            return <div className="ml-10 text-sm text-gray-500 dark:text-gray-400 italic">{t('No replies yet.')}</div>;
        }

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
                    />
                ))}
            </div>
        );
    }, [replies, isLoading, t]);

    if (!showReplies) {
        return null;
    }

    return (
        <div
            className="w-full mt-4"
            aria-expanded={showReplies}
            aria-label={t('Replies')}
        >
            {memoizedReplies}
        </div>
    );
});

export default CommentReplies;
