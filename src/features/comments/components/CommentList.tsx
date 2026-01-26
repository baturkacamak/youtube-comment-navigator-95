// src/features/comments/components/CommentList.tsx
import React, { useEffect, useMemo } from 'react';
import CommentItem from './CommentItem';
import { ArrowPathIcon, ExclamationCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import Box from "../../shared/components/Box";
import { motion } from 'framer-motion';
import { getCommentBackgroundColor } from '../../shared/utils/colorUtils';
import { CommentListProps, Comment } from "../../../types/commentTypes";
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from "../../../types/rootState";
import { extractYouTubeVideoIdFromUrl } from '../../shared/utils/extractYouTubeVideoIdFromUrl';
import { setTotalCommentsCount } from "../../../store/store";
import { useCommentsFromDB } from '../hooks/useCommentsFromDB';

// Pre-compute alternating colors once (they only depend on even/odd index)
const CACHED_COLORS = {
    even: getCommentBackgroundColor({} as Comment, 0),
    odd: getCommentBackgroundColor({} as Comment, 1),
};

// Simplified animation variants - removed expensive 'layout' prop
const itemVariants = {
    initial: { opacity: 0, y: -5 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 5 },
};

const CommentList: React.FC<CommentListProps> = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();

    // Get filters and search from Redux (UI state)
    const filters = useSelector((state: RootState) => state.filters);
    const searchKeyword = useSelector((state: RootState) => state.searchKeyword);

    const videoId = extractYouTubeVideoIdFromUrl();

    // Use the new reactive hook - IndexedDB is the source of truth
    // This hook provides:
    // - Reactive total count (updates automatically when DB changes)
    // - Paginated comments loading
    // - Load more functionality
    const {
        comments,
        totalCount,
        isLoading,
        hasMore,
        loadMore,
        page,
    } = useCommentsFromDB({
        videoId,
        filters,
        searchKeyword,
        topLevelOnly: true,
        excludeLiveChat: true,
    });

    // Sync totalCount to Redux for components that still need it
    // This keeps Redux as a "view buffer" - only reflecting what's displayed
    useEffect(() => {
        dispatch(setTotalCommentsCount(totalCount));
    }, [totalCount, dispatch]);

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
                // PERF: Use cached colors instead of computing on every render
                // Colors only alternate based on even/odd index
                const colors = idx % 2 === 0 ? CACHED_COLORS.even : CACHED_COLORS.odd;
                return (
                    <motion.div
                        key={comment.commentId}
                        variants={itemVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        // PERF: Removed 'layout' prop - was causing O(n) recalculations
                        // for ALL items whenever any single item changed
                        transition={{ duration: 0.2 }}
                        role="listitem"
                        aria-labelledby={`comment-${comment.commentId}`}
                    >
                        <CommentItem
                            comment={comment}
                            className="text-gray-800 dark:text-gray-200"
                            bgColor={colors.bgColor}
                            darkBgColor={colors.darkBgColor}
                            borderColor={colors.borderColor}
                            darkBorderColor={colors.darkBorderColor}
                        />
                    </motion.div>
                );
            })}
            {hasMore && (
                <button
                    onClick={loadMore}
                    disabled={isLoading}
                    className={`mt-4 py-2 px-4 bg-zinc-600 text-white rounded hover:bg-zinc-800 dark:bg-blue-700 dark:hover:bg-blue-800 flex items-center justify-center ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    aria-label={t('Load more comments')}
                >
                    {isLoading ? <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" /> : <ChevronDownIcon className="w-5 h-5 mr-2" />}
                    {t('Load More Comments ({{remaining}} remaining)', { remaining })}
                </button>
            )}
        </div>
    );
};

export default CommentList;