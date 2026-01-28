// src/features/comments/components/CommentList.tsx
import React, { useEffect, useCallback, useRef } from 'react';
import { VariableSizeList as List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import CommentItem from './CommentItem';
import {
  ArrowPathIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import Box from '../../shared/components/Box';
import { getCommentBackgroundColor } from '../../shared/utils/colorUtils';
import { CommentListProps, Comment } from '../../../types/commentTypes';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../types/rootState';
import { extractYouTubeVideoIdFromUrl } from '../../shared/utils/extractYouTubeVideoIdFromUrl';
import { setTotalCommentsCount } from '../../../store/store';
import { useCommentsFromDB } from '../hooks/useCommentsFromDB';

import logger from '../../shared/utils/logger';

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
  const { comments, totalCount, isLoading, hasMore, loadMore, error, clearError } =
    useCommentsFromDB({
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

  // Calculate container dimensions to fill remaining space (prevent double scrollbar)
  const containerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = React.useState(600);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Calculate available height: Viewport - Top Position - Buffer (20px)
        const availableHeight = window.innerHeight - rect.top - 20;
        // Ensure minimum height of 400px
        setListHeight(Math.max(400, availableHeight));
      }
    };

    // Initial calculation
    updateDimensions();

    // Recalculate on resize
    window.addEventListener('resize', updateDimensions);

    // Also recalculate when comments/filters change as layout might shift
    // (Optional but helpful if header size changes)

    return () => window.removeEventListener('resize', updateDimensions);
  }, [comments.length, filters, searchKeyword]);

  // Reset cached heights when comments change significantly
  useEffect(() => {
    rowHeightsRef.current.clear();
    listRef.current?.resetAfterIndex(0);
  }, [comments.length, filters, searchKeyword]);

  // Get row height - use cached measurement or estimate
  const getRowHeight = useCallback(
    (index: number): number => {
      // Last row is the "Load More" button
      if (index === comments.length) {
        return hasMore ? 60 : 0;
      }
      const cached = rowHeightsRef.current.get(index);
      if (cached) return cached;
      return estimateRowHeight(comments[index]);
    },
    [comments, hasMore]
  );

  // Callback to update actual height after render
  const setRowHeight = useCallback((index: number, height: number) => {
    const currentHeight = rowHeightsRef.current.get(index);
    if (currentHeight !== height) {
      rowHeightsRef.current.set(index, height);
      listRef.current?.resetAfterIndex(index);
    }
  }, []);

  // Row renderer for virtualized list
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
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
              {isLoading ? (
                <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 mr-2" />
              )}
              {t('Load More Comments ({{remaining}} remaining)', { remaining })}
            </button>
          </div>
        );
      }

      const comment = comments[index];
      const colors = index % 2 === 0 ? CACHED_COLORS.even : CACHED_COLORS.odd;

      return (
        <div
          style={{ ...style, overflow: 'visible' }}
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
    },
    [comments, hasMore, totalCount, loadMore, isLoading, t, setRowHeight]
  );

  if (isLoading && comments.length === 0) {
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

  if (!comments.length) {
    if (error) {
      return (
        <div
          className="flex flex-col items-center justify-center p-8 mt-4 text-red-600 dark:text-red-400 border-2 border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20"
          role="alert"
        >
          <XCircleIcon className="w-16 h-16 mb-4" />
          <h3 className="text-lg font-bold mb-2">{t('Error loading comments')}</h3>
          <p className="text-center mb-4">{error.message}</p>
          <button
            onClick={clearError}
            className="px-6 py-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors font-medium"
          >
            {t('Dismiss')}
          </button>
        </div>
      );
    }

    return (
      <Box className="flex flex-col items-center justify-center p-4 mt-4" aria-live="polite">
        <ExclamationCircleIcon className="w-16 h-16 text-gray-500 dark:text-gray-400 mb-4" />
        <p className="text-lg text-gray-800 dark:text-gray-200">
          {t('No comments found. Try a different search or filter.')}
        </p>
      </Box>
    );
  }

  // Item count includes the "Load More" button as the last item
  const itemCount = comments.length + (hasMore ? 1 : 0);

  return (
    <div
      ref={containerRef}
      className="w-full flex flex-col"
      style={{ height: listHeight, minHeight: '400px' }}
    >
      {error && (
        <div
          className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative mb-2 flex items-center justify-between shadow-sm"
          role="alert"
        >
          <div className="flex items-center">
            <XCircleIcon className="w-5 h-5 mr-2" />
            <span className="block sm:inline">{error.message}</span>
          </div>
          <button
            onClick={clearError}
            className="text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 font-bold ml-2"
          >
            <span className="sr-only">Close</span>
            <svg
              className="fill-current h-6 w-6"
              role="button"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <title>Close</title>
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.03-2.759-3.031a1.2 1.2 0 1 1 1.697-1.697l2.652 3.031 2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.031 2.758 3.03a1.2 1.2 0 0 1 0 1.698z" />
            </svg>
          </button>
        </div>
      )}
      <div className="flex-1 w-full min-h-0">
        <AutoSizer
          renderProp={({
            height,
            width,
          }: {
            height: number | undefined;
            width: number | undefined;
          }) => {
            if (!height || !width) {
              logger.warn('[CommentList] AutoSizer returned 0 dimensions:', { width, height });
              return (
                <div className="p-4 text-red-500">
                  Error: List container has no size. ({width}x{height})
                </div>
              );
            }

            if (typeof height !== 'number' || typeof width !== 'number') {
              return null;
            }

            // Sanity check for infinite growth loop
            if (height > 50000) {
              logger.error('[CommentList] Layout loop detected! Height is absurdly large:', height);
              return (
                <div className="p-4 text-red-500">
                  Error: Layout loop detected. Height: {height}px
                </div>
              );
            }

            // Only log periodically or on significant changes to avoid spam, but for now debug everything
            logger.debug('[CommentList] Rendering list:', { itemCount, width, height });

            return (
              <List
                ref={listRef}
                height={height}
                width={width}
                itemCount={itemCount}
                itemSize={getRowHeight}
                overscanCount={5}
                style={{ overflow: 'visible auto' }}
                className="custom-scrollbar"
              >
                {Row}
              </List>
            );
          }}
        />
      </div>
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

const MeasuredCommentItem: React.FC<MeasuredCommentItemProps> = React.memo(
  ({ comment, index, colors, onHeightChange }) => {
    const measureRef = useRef<HTMLDivElement>(null);

    // Use ResizeObserver to detect height changes (e.g., when replies are expanded)
    useEffect(() => {
      const element = measureRef.current;
      if (!element) return;

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const height = entry.contentRect.height;
          if (height > 0) {
            onHeightChange(index, height);
          }
        }
      });

      resizeObserver.observe(element);

      // Initial measurement
      const initialHeight = element.getBoundingClientRect().height;
      if (initialHeight > 0) {
        onHeightChange(index, initialHeight);
      }

      return () => {
        resizeObserver.disconnect();
      };
    }, [index, onHeightChange]);

    return (
      <div ref={measureRef} className="flow-root">
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
  }
);

MeasuredCommentItem.displayName = 'MeasuredCommentItem';

export default CommentList;
