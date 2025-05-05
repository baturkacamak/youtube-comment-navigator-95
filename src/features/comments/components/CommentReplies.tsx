import React, {useMemo} from 'react';
import CommentItem from './CommentItem';
import {CommentRepliesProps} from "../../../types/commentTypes";
import {useTranslation} from 'react-i18next';
import {useSelector} from "react-redux";
import { RootState } from "../../../types/rootState";

const CommentReplies: React.FC<CommentRepliesProps> = ({
                                                           replies: propReplies,
                                                           showReplies,
                                                           repliesRef,
                                                           repliesHeight,
                                                           parentCommentId
                                                       }) => {
    const {t} = useTranslation();
    const storeReplies = useSelector((state: RootState) => state.replies);
    const effectiveReplies = propReplies.length > 0
        ? propReplies
        : storeReplies.filter(reply => reply.commentParentId === parentCommentId);

    const memoizedReplies = useMemo(() => {
        return (
            <div className="mt-4 space-y-4">
                {effectiveReplies.map((reply, index) => (
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
    }, [effectiveReplies, t]);

    return (
        <div
            className={`w-full transition-all duration-500 ease-in-out ${showReplies ? 'animate-slide-in mt-4' : 'animate-slide-out overflow-hidden '}`}
            style={{maxHeight: showReplies ? repliesHeight : '0px'}}
            ref={repliesRef}
            aria-expanded={showReplies}
            aria-label={t('Replies')}
        >
            {showReplies && memoizedReplies}
        </div>
    );
};

export default CommentReplies;
