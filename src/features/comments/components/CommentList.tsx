// src/features/comments/components/CommentList.tsx
import React, { useState, useEffect, useRef } from 'react';
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
import { setComments, setIsLoading } from "../../../store/store";
import logger from '../../shared/utils/logger';
import { PAGINATION } from "../../shared/utils/appConstants.ts";

const CommentList: React.FC<CommentListProps> = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const isLoading = useSelector((state: RootState) => state.isLoading);
    const filters = useSelector((state: RootState) => state.filters);
    const comments = useSelector((state: RootState) => state.comments);

    const videoId = extractYouTubeVideoIdFromUrl();
    const hasInitialized = useRef(false);
    const prevSortBy = useRef(filters.sortBy);
    const prevSortOrder = useRef(filters.sortOrder);

    useEffect(() => {
        const getTotalCount = async () => {
            try {
                const count = await countComments(videoId, { topLevelOnly: true });
                setTotalCount(count);
                setHasMore(count > (page + 1) * PAGINATION.DEFAULT_PAGE_SIZE);
                logger.info(`[Count] Top-level comments for ${videoId}:`, count);
            } catch (err) {
                logger.error('Failed to fetch top-level comment count:', err);
            }
        };

        if (videoId) {
            getTotalCount();
        }
    }, [videoId, page]);

    useEffect(() => {
        const loadInitialComments = async () => {
            if (!hasInitialized.current) {
                hasInitialized.current = true;
                dispatch(setIsLoading(true));
                try {
                    logger.start('loadInitialComments');
                    const initialComments = await loadPagedComments(
                        videoId,
                        PAGINATION.INITIAL_PAGE,
                        PAGINATION.DEFAULT_PAGE_SIZE,
                        filters.sortBy || 'date',
                        filters.sortOrder || 'desc'
                    );
                    dispatch(setComments(initialComments));
                    // Store initial sort values
                    prevSortBy.current = filters.sortBy;
                    prevSortOrder.current = filters.sortOrder;
                    logger.success('Initial comments loaded successfully');
                } catch (error) {
                    logger.error('Error loading initial comments:', error);
                } finally {
                    dispatch(setIsLoading(false));
                    logger.end('loadInitialComments');
                }
            }
        };

        loadInitialComments();
    }, [videoId, dispatch, filters.sortBy, filters.sortOrder]);

    // Add a new effect to handle sort changes
    useEffect(() => {
        // Only react to changes after initialization
        if (hasInitialized.current &&
            (prevSortBy.current !== filters.sortBy || prevSortOrder.current !== filters.sortOrder)) {

            logger.info(`Sort changed from ${prevSortBy.current}/${prevSortOrder.current} to ${filters.sortBy}/${filters.sortOrder}`);

            setPage(0);
            setIsLoadingMore(false);
            dispatch(setIsLoading(true));

            const reloadWithNewSort = async () => {
                try {
                    logger.start('reloadWithNewSort');
                    const sortedComments = await loadPagedComments(
                        videoId,
                        PAGINATION.INITIAL_PAGE,
                        PAGINATION.DEFAULT_PAGE_SIZE,
                        filters.sortBy || 'date',
                        filters.sortOrder || 'desc'
                    );
                    dispatch(setComments(sortedComments));

                    // Update refs to new values
                    prevSortBy.current = filters.sortBy;
                    prevSortOrder.current = filters.sortOrder;

                    logger.success(`Comments reloaded with sort: ${filters.sortBy} ${filters.sortOrder}`);
                } catch (error) {
                    logger.error('Error reloading comments with new sort:', error);
                } finally {
                    dispatch(setIsLoading(false));
                    logger.end('reloadWithNewSort');
                }
            };

            reloadWithNewSort();
        }
    }, [filters.sortBy, filters.sortOrder, dispatch, videoId]);

    const loadMoreComments = async () => {
        if (isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);
        try {
            logger.start('loadMoreComments');
            const nextPage = page + 1;
            const newComments = await loadPagedComments(
                videoId,
                nextPage,
                PAGINATION.DEFAULT_PAGE_SIZE,
                filters.sortBy || 'date',
                filters.sortOrder || 'desc'
            );

            if (newComments.length === 0) {
                setHasMore(false);
                logger.info('No more comments to load.');
            } else {
                const updatedComments = [...comments, ...newComments];
                dispatch(setComments(updatedComments));
                setPage(nextPage);
                setHasMore((page + 1) * PAGINATION.DEFAULT_PAGE_SIZE < totalCount);
                logger.success(`Loaded ${newComments.length} more comments.`);
            }
        } catch (error) {
            logger.error('Error loading more comments:', error);
        } finally {
            setIsLoadingMore(false);
            logger.end('loadMoreComments');
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

    const remainingComments = totalCount - comments.length;

    return (
        <div key={`comment-list`} className="flex flex-col">
            {comments.map((comment, index) => {
                const { bgColor, darkBgColor, borderColor, darkBorderColor } =
                    getCommentBackgroundColor(comment, index);
                return (
                    <motion.div
                        key={comment.commentId}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        layout
                        transition={{ duration: 0.5 }}
                        role="listitem"
                        aria-labelledby={`comment-${comment.commentId}`}
                    >
                        <CommentItem
                            comment={comment}
                            className="text-gray-800 dark:text-gray-200"
                            bgColor={bgColor}
                            darkBgColor={darkBgColor}
                            borderColor={borderColor}
                            darkBorderColor={darkBorderColor}
                        />
                    </motion.div>
                );
            })}
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