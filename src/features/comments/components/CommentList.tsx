import React, { useCallback, useMemo } from 'react';
import CommentItem from './CommentItem';
import { ArrowPathIcon, ExclamationCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import Box from "../../shared/components/Box";
import { AnimatePresence, motion } from 'framer-motion';
import { getCommentBackgroundColor } from '../../shared/utils/colorUtils';
import { Comment, CommentQueryOptions } from "../../../types/commentTypes";
import { useTranslation } from 'react-i18next';
import { useSelector } from "react-redux";
import { RootState } from "../../../types/rootState";
import useCommentsQuery from '../hooks/useCommentsQuery';

interface CommentListProps {
    comments: Comment[];
    queryOptions?: CommentQueryOptions;
}

const CommentList: React.FC<CommentListProps> = ({ comments: providedComments, queryOptions }) => {
    const { t } = useTranslation();
    const filters = useSelector((state: RootState) => state.filters);
    const searchKeyword = useSelector((state: RootState) => state.searchKeyword);

    const mergedOptions = useMemo(() => {
        const basicFilters = {
            hasTimestamp: filters.timestamps,
            isHearted: filters.heart,
            hasLinks: filters.links,
            isMember: filters.members,
            isDonated: filters.donated,
            isAuthorContentCreator: filters.creator
        };

        const advancedFilters = {
            likesThreshold: filters.likesThreshold,
            repliesLimit: filters.repliesLimit,
            wordCount: filters.wordCount,
            dateTimeRange: filters.dateTimeRange
        };

        const sortOptions = {
            sortBy: filters.sortBy || 'date',
            sortOrder: (filters.sortOrder || 'desc') as 'asc' | 'desc'
        };

        return {
            basicFilters,
            advancedFilters,
            sortOptions,
            searchTerm: searchKeyword,
            ...queryOptions
        };
    }, [filters, searchKeyword, queryOptions]);

    const {
        comments,
        isLoading,
        hasMore,
        totalCount,
        loadMore
    } = useCommentsQuery(mergedOptions);

    const displayedComments = providedComments && providedComments.length > 0 ? providedComments : comments;

    const groupCommentsByParent = useCallback((comments: Comment[]) => {
        const parentMap = new Map<string, { comment: Comment, replies: Comment[] }>();

        comments.forEach(comment => {
            if (comment.replyLevel === 0) {
                parentMap.set(comment.commentId, { comment, replies: [] });
            } else if (comment.commentParentId && parentMap.has(comment.commentParentId)) {
                parentMap.get(comment.commentParentId)!.replies.push(comment);
            }
        });

        return Array.from(parentMap.values());
    }, []);

    if (isLoading && displayedComments.length === 0) {
        return (
            <Box className="flex flex-col items-center justify-center p-4 mt-4">
                <ArrowPathIcon className="w-16 h-16 text-gray-500 dark:text-gray-400 mb-4 animate-spin" />
                <p className="text-lg text-gray-800 dark:text-gray-200">{t('Loading comments...')}</p>
            </Box>
        );
    }

    if (displayedComments.length === 0) {
        return (
            <Box className="flex flex-col items-center justify-center p-4 mt-4">
                <ExclamationCircleIcon className="w-16 h-16 text-gray-500 dark:text-gray-400 mb-4" />
                <p className="text-lg text-gray-800 dark:text-gray-200">{t('No comments found. Try a different search or filter.')}</p>
            </Box>
        );
    }

    const groupedComments = groupCommentsByParent(displayedComments);
    const remainingComments = totalCount - displayedComments.length;

    return (
        <div className="flex flex-col">
            <div className="mb-4 flex justify-between items-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('Showing {{shown}} of {{total}} comments', {
                        shown: displayedComments.filter(c => c.replyLevel === 0).length,
                        total: totalCount
                    })}
                </p>
            </div>

            <AnimatePresence>
                {groupedComments.map((group, index) => {
                    const { bgColor, darkBgColor, borderColor, darkBorderColor } = getCommentBackgroundColor(group.comment, index);
                    return (
                        <motion.div
                            key={group.comment.commentId}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            layout
                            transition={{ duration: 0.3 }}
                        >
                            <CommentItem
                                comment={group.comment}
                                replies={group.replies}
                                className="text-gray-800 dark:text-gray-200"
                                bgColor={bgColor}
                                darkBgColor={darkBgColor}
                                borderColor={borderColor}
                                darkBorderColor={darkBorderColor}
                            />
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            {hasMore && (
                <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className={`mt-4 py-2 px-4 bg-zinc-600 text-white transition-all ease-in-out duration-300 dark:bg-blue-700 dark:text-gray-200 rounded hover:bg-zinc-800 dark:hover:bg-blue-800 flex items-center justify-center ${
                        isLoading ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                    aria-label={t('Load more comments')}
                >
                    {isLoading ? (
                        <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                        <ChevronDownIcon className="w-5 h-5 mr-2" />
                    )}
                    {t('Load More Comments ({{count}} remaining)', { count: remainingComments })}
                </button>
            )}
        </div>
    );
};

export default CommentList;