// src/features/comments/components/CommentList.tsx
import React, { useEffect, useCallback, useRef, useState } from 'react';
import { VariableSizeList as List } from 'react-window';
import CommentItem from './CommentItem';
import { ArrowPathIcon, ExclamationCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import Box from "../../shared/components/Box";
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

// Estimate row height based on content length
// Base height + extra for longer content
const BASE_ROW_HEIGHT = 120;
const CHARS_PER_LINE = 80;
const LINE_HEIGHT = 20;

const estimateRowHeight = (comment: Comment): number => {
    const contentLines = Math.ceil((comment.content?.length || 0) / CHARS_PER_LINE);
    const extraHeight = Math.max(0, contentLines - 2) * LINE_HEIGHT;
    // Add extra for replies indicator, badges, etc.
    const hasReplies = comment.replyCount > 0 ? 30 : 0;
    return BASE_ROW_HEIGHT + extraHeight + hasReplies;
};

const CommentList: React.FC<CommentListProps> = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const listRef = useRef<List>(null);
    const rowHeightsRef = useRef<Map<number, number>>(new Map());

    // Get filters and search from Redux (UI state)
    const filters = useSelector((state: RootState) => state.filters);
    const searchKeyword = useSelector((state: RootState) => state.searchKeyword);

    const videoId = extractYouTubeVideoIdFromUrl();

    // Use the new reactive hook - IndexedDB is the source of truth
    const {
        comments,
        totalCount,
        isLoading,
        hasMore,
        loadMore,
    } = useCommentsFromDB({
        videoId,
        filters,
        searchKeyword,
        topLevelOnly: true,
        excludeLiveChat: true,
    });

    // Sync totalCount to Redux for components that still need it
    useEffect(() => {
        dispatch(setTotalCommentsCount(totalCount));
    }, [totalCount, dispatch]);

    // Reset cached heights when comments change significantly
    useEffect(() => {
        rowHeightsRef.current.clear();
        listRef.current?.resetAfterIndex(0);
    }, [comments.length, filters, searchKeyword]);

    // Get row height - use cached measurement or estimate
    const getRowHeight = useCallback((index: number): number => {
        // Last row is the "Load More" button
        if (index === comments.length) {
            return hasMore ? 60 : 0;
        }
        const cached = rowHeightsRef.current.get(index);
        if (cached) return cached;
        return estimateRowHeight(comments[index]);
    }, [comments, hasMore]);

    // Callback to update actual height after render
    const setRowHeight = useCallback((index: number, height: number) => {
        const currentHeight = rowHeightsRef.current.get(index);
        if (currentHeight !== height) {
            rowHeightsRef.current.set(index, height);
            listRef.current?.resetAfterIndex(index);
        }
    }, []);

    // Row renderer for virtualized list
    const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
        // Render "Load More" button as last item
        if (index === comments.length) {
            if (!hasMore) return null;
            const remaining = totalCount - comments.length;
            return (
                <div style={style} className="flex justify-center py-2">
                    <button
                        onClick={loadMore}
                        disabled={isLoading}
                        className={`py-2 px-4 bg-zinc-600 text-white rounded hover:bg-zinc-800 dark:bg-blue-700 dark:hover:bg-blue-800 flex items-center justify-center ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        aria-label={t('Load more comments')}
                    >
                        {isLoading ? <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" /> : <ChevronDownIcon className="w-5 h-5 mr-2" />}
                        {t('Load More Comments ({{remaining}} remaining)', { remaining })}
                    </button>
                </div>
            );
        }

        const comment = comments[index];
        const colors = index % 2 === 0 ? CACHED_COLORS.even : CACHED_COLORS.odd;

        return (
            <div
                style={style}
                role="listitem"
                aria-labelledby={`comment-${comment.commentId}`}
            >
                <MeasuredCommentItem
                    comment={comment}
                    index={index}
                    colors={colors}
                    onHeightChange={setRowHeight}
                />
            </div>
        );
    }, [comments, hasMore, totalCount, loadMore, isLoading, t, setRowHeight]);

    if (isLoading && comments.length === 0) {
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

    // Item count includes the "Load More" button as the last item
    const itemCount = comments.length + (hasMore ? 1 : 0);

    // Calculate container dimensions
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 600 });

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                // Use viewport height minus some offset for the container
                const availableHeight = window.innerHeight - rect.top - 50;
                setDimensions({
                    width: rect.width || containerRef.current.offsetWidth,
                    height: Math.max(400, availableHeight),
                });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    return (
        <div ref={containerRef} className="flex flex-col" style={{ height: dimensions.height, minHeight: '400px' }}>
            {dimensions.width > 0 && (
                <List
                    ref={listRef}
                    height={dimensions.height}
                    width={dimensions.width}
                    itemCount={itemCount}
                    itemSize={getRowHeight}
                    overscanCount={5}
                >
                    {Row}
                </List>
            )}
        </div>
    );
};

// Measured wrapper to track actual heights
interface MeasuredCommentItemProps {
    comment: Comment;
    index: number;
    colors: { bgColor: string; darkBgColor: string; borderColor: string; darkBorderColor: string };
    onHeightChange: (index: number, height: number) => void;
}

const MeasuredCommentItem: React.FC<MeasuredCommentItemProps> = React.memo(({
    comment,
    index,
    colors,
    onHeightChange,
}) => {
    const measureRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (measureRef.current) {
            const height = measureRef.current.getBoundingClientRect().height;
            onHeightChange(index, height);
        }
    }, [index, onHeightChange, comment.content]);

    return (
        <div ref={measureRef}>
            <CommentItem
                comment={comment}
                className="text-gray-800 dark:text-gray-200"
                bgColor={colors.bgColor}
                darkBgColor={colors.darkBgColor}
                borderColor={colors.borderColor}
                darkBorderColor={colors.darkBorderColor}
            />
        </div>
    );
});

MeasuredCommentItem.displayName = 'MeasuredCommentItem';

export default CommentList;