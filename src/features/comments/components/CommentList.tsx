// src/features/comments/components/CommentList.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import CommentItem from './CommentItem';
import { ArrowPathIcon, ExclamationCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import Box from "../../shared/components/Box";
import { motion } from 'framer-motion';
import { getCommentBackgroundColor } from '../../shared/utils/colorUtils';
import { CommentListProps } from "../../../types/commentTypes";
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from "../../../types/rootState";
import { loadPagedComments, countComments } from '../services/pagination';
import { extractYouTubeVideoIdFromUrl } from '../../shared/utils/extractYouTubeVideoIdFromUrl';
import { setComments, setIsLoading } from "../../../store/store";
import logger from '../../shared/utils/logger';
import {PAGINATION} from "../../shared/utils/appConstants.ts";

const CommentList: React.FC<CommentListProps> = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    const filters = useSelector((state: RootState) => state.filters);
    const comments = useSelector((state: RootState) => state.comments);
    const isLoading = useSelector((state: RootState) => state.isLoading);

    const videoId = extractYouTubeVideoIdFromUrl();
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Memoize sort values
    const sortBy = useMemo(() => filters.sortBy || 'date', [filters.sortBy]);
    const sortOrder = useMemo(() => filters.sortOrder || 'desc', [filters.sortOrder]);

    // Fetch total count whenever videoId changes or comments added
    useEffect(() => {
        if (!videoId) return;
        const fetchCount = async () => {
            try {
                const count = await countComments(videoId, { topLevelOnly: true });
                setTotalCount(count);
                setHasMore(count > (page + 1) * PAGINATION.DEFAULT_PAGE_SIZE);
                logger.info(`Comment count for ${videoId}: ${count}`);
            } catch (err) {
                logger.error('Failed to fetch comment count:', err);
            }
        };
        fetchCount();
    }, [videoId, page]);

    // Central comment loader
    const fetchComments = useCallback(
        async (pageNum: number) => {
            try {
                const data = await loadPagedComments(
                    videoId,
                    pageNum,
                    PAGINATION.DEFAULT_PAGE_SIZE,
                    sortBy,
                    sortOrder
                );
                return data;
            } catch (err) {
                logger.error('Error fetching comments:', err);
                return [];
            }
        },
        [videoId, sortBy, sortOrder]
    );

    // Initial load & sort change
    useEffect(() => {
        if (!videoId) return;
        dispatch(setIsLoading(true));
        setPage(0);
        fetchComments(0).then(data => {
            dispatch(setComments(data));
        }).finally(() => dispatch(setIsLoading(false)));
    }, [videoId, fetchComments, dispatch]);

    // Load more
    const loadMore = async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        fetchComments(page + 1).then(data => {
            if (!data.length) {
                setHasMore(false);
            } else {
                dispatch(setComments([...comments, ...data]));
                setPage(prev => prev + 1);
            }
        }).finally(() => setLoadingMore(false));
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-4 mt-4 bg-gradient-to-r from-teal-100 to-teal-300 dark:bg-gradient-to-r dark:from-gray-700 dark:to-gray-900 border-2 border-gray-400 dark:border-gray-600 rounded-lg shadow-md" role="status" aria-live="polite">
                <ArrowPathIcon className="w-16 h-16 text-gray-500 dark:text-gray-400 mb-4 animate-spin" />
                <p className="text-lg text-gray-800 dark:text-gray-200">{t('Loading comments...')}</p>
            </div>
        );
    }

    if (!comments.length) {
        return (
            <Box className="flex flex-col items-center justify-center p-4 mt-4" aria-live="polite">
                <ExclamationCircleIcon className="w-16 h-16 text-gray-500 dark:text-gray-400 mb-4" />
                <p className="text-lg text-gray-800 dark:text-gray-200">{t('No comments found. Try a different search or filter.')}</p>
            </Box>
        );
    }

    const remaining = totalCount - comments.length;

    return (
        <div className="flex flex-col">
            {comments.map((comment, idx) => {
                const { bgColor, darkBgColor, borderColor, darkBorderColor } = getCommentBackgroundColor(comment, idx);
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
                    onClick={loadMore}
                    disabled={loadingMore}
                    className={`mt-4 py-2 px-4 bg-zinc-600 text-white rounded hover:bg-zinc-800 dark:bg-blue-700 dark:hover:bg-blue-800 flex items-center justify-center ${loadingMore ? 'opacity-70 cursor-not-allowed' : ''}`}
                    aria-label={t('Load more comments')}
                >
                    {loadingMore ? <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" /> : <ChevronDownIcon className="w-5 h-5 mr-2" />}
                    {t('Load More Comments ({{remaining}} remaining)', { remaining })}
                </button>
            )}
        </div>
    );
};

export default CommentList;
