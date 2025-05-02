// src/features/comments/components/CommentList.tsx
import React, { useState, useEffect } from 'react';
import CommentItem from './CommentItem';
import { ArrowPathIcon, ExclamationCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import Box from "../../shared/components/Box";
import { AnimatePresence, motion } from 'framer-motion';
import { getCommentBackgroundColor } from '../../shared/utils/colorUtils';
import { Comment, CommentListProps } from "../../../types/commentTypes";
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../../../types/rootState";
import { loadPagedComments, countComments } from '../services/pagination';
import { extractYouTubeVideoIdFromUrl } from '../../shared/utils/extractYouTubeVideoIdFromUrl';
import { setComments } from "../../../store/store";

const CommentList: React.FC<CommentListProps> = ({ comments }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const isLoading = useSelector((state: RootState) => state.isLoading);
    const filters = useSelector((state: RootState) => state.filters);

    // Get video ID for loading comments
    const videoId = extractYouTubeVideoIdFromUrl();

    // Load total comment count
    useEffect(() => {
        const getTotalCount = async () => {
            const count = await countComments(videoId);
            setTotalCount(count);
            setHasMore(count > (page + 1) * 20);
        };

        if (videoId) {
            getTotalCount();
        }
    }, [videoId, page]);

    const loadMoreComments = async () => {
        if (isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);
        try {
            const nextPage = page + 1;
            const newComments = await loadPagedComments(
                videoId,
                nextPage,
                20,
                filters.sortBy || 'date',
                filters.sortOrder || 'desc'
            );

            if (newComments.length === 0) {
                setHasMore(false);
            } else {
                // Append new comments to existing ones
                dispatch(setComments([...comments, ...newComments]));
                setPage(nextPage);
                setHasMore(newComments.length === 20);
            }
        } catch (error) {
            console.error('Error loading more comments:', error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    if (isLoading) {
        return (
            <div
                className="flex flex-col items-center justify-center p-4 mt-4 bg-gradient-to-r from-teal-100 to-teal-300 dark:bg-gradient-to-r dark:from-gray-700 dark:to-gray-900 border-2 border-gray-400 dark:border-gray-600 rounded-lg shadow-md"
                role="status"
                aria-live="polite"
            >
                <ArrowPathIcon className="w-16 h-16 text-gray-500 dark:text-gray-400 mb-4 animate-spin" />
                <p className="text-lg text-gray-800 dark:text-gray-200">{t('Loading comments...')}</p>
            </div>
        );
    }

    if (comments.length === 0) {
        return (
            <Box className="flex flex-col items-center justify-center p-4 mt-4" aria-live="polite">
                <ExclamationCircleIcon className="w-16 h-16 text-gray-500 dark:text-gray-400 mb-4" />
                <p className="text-lg text-gray-800 dark:text-gray-200">{t('No comments found. Try a different search or filter.')}</p>
            </Box>
        );
    }

    // Optimized grouping of comments by parentCommentId
    const groupCommentsByParent = (comments: Comment[]) => {
        const parentMap = new Map<string, { comment: Comment, replies: Comment[] }>();

        comments.forEach(comment => {
            if (comment.replyLevel === 0) {
                parentMap.set(comment.commentId, { comment, replies: [] });
            } else {
                const parentId = comment.commentParentId;
                if (parentId && parentMap.has(parentId)) {
                    parentMap.get(parentId)!.replies.push(comment);
                }
            }
        });

        const groupedComments = Array.from(parentMap.values());
        return groupedComments;
    };

    const visibleComments = groupCommentsByParent(comments);
    const remainingComments = totalCount - comments.length;

    return (
        <div key={`comment-list`} className="flex flex-col">
            <AnimatePresence>
                {visibleComments.map((group, index) => {
                    const { bgColor, darkBgColor, borderColor, darkBorderColor } =
                        getCommentBackgroundColor(group.comment, index);
                    return (
                        <motion.div
                            key={group.comment.commentId}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            layout
                            transition={{ duration: 0.5 }}
                            role="listitem"
                            aria-labelledby={`comment-${group.comment.commentId}`}
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
                    onClick={loadMoreComments}
                    disabled={isLoadingMore}
                    className={`mt-4 py-2 px-4 bg-zinc-600 text-white transition-all ease-in-out duration-300 dark:bg-blue-700 dark:text-gray-200 rounded hover:bg-zinc-800 dark:hover:bg-blue-800 flex items-center justify-center ${isLoadingMore ? 'opacity-70 cursor-not-allowed' : ''}`}
                    aria-label={t('Load more comments')}
                >
                    {isLoadingMore ? (
                        <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
                    ) : (
                        <ChevronDownIcon className="w-5 h-5 mr-2" aria-hidden="true" />
                    )}
                    {t('Load More Comments ({{remainingComments}} remaining)', { remainingComments })}
                </button>
            )}
        </div>
    );
};

export default CommentList;