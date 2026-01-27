import { useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Comment } from '../../../../types/commentTypes';
import useFilterComments from './useFilterComments';
import useLoadMoreComments from './useLoadMoreComments';
import useDebouncedSort from './useDebouncedSort';
import sortByDate from './normal/sortByDate';
import sortByLikes from './normal/sortByLikes';
import sortByReplies from './normal/sortByReplies';
import sortByLength from './normal/sortByLength';
import sortByAuthor from './normal/sortByAuthor';
import sortByRandom from './normal/sortByRandom';
import { calculateNormalized, getMaxValues, MaxValues } from './advanced/calculateNormalized';
import { calculateWeightedZScore, getStats, ZScoreStats } from './advanced/calculateWeightedZScore';
import {
  calculateBayesianAverage,
  getAvgValues,
  AvgValues,
} from './advanced/calculateBayesianAverage';

const useSortedComments = (_initialLoadCompleted: boolean) => {
  const comments = useSelector((state: any) => state.comments);
  const filters = useSelector((state: any) => state.filters);

  const applyFilters = useFilterComments(filters);
  const previousSortByRef = useRef<string | null>(null);
  const previousSortOrderRef = useRef<string | null>(null);

  const sortComments = useCallback(
    (comments: Comment[], sortBy: string, sortOrder: string) => {
      const filteredComments = applyFilters(comments);
      const commentsToSort = [...filteredComments];

      // PERFORMANCE FIX: Precompute stats ONCE before sorting, not inside comparator
      // This changes complexity from O(n² log n) to O(n log n)
      let precomputedMaxValues: MaxValues | null = null;
      let precomputedStats: ZScoreStats | null = null;
      let precomputedAvgValues: AvgValues | null = null;

      // Only compute the stats needed for the current sort type
      if (sortBy === 'normalized') {
        precomputedMaxValues = getMaxValues(commentsToSort);
      } else if (sortBy === 'zscore') {
        precomputedStats = getStats(commentsToSort);
      } else if (sortBy === 'bayesian') {
        precomputedAvgValues = getAvgValues(commentsToSort);
      }

      const sortFunc = (a: Comment, b: Comment) => {
        switch (sortBy) {
          case 'date':
            return sortByDate(a, b, sortOrder);
          case 'likes':
            return sortByLikes(a, b, sortOrder);
          case 'replies':
            return sortByReplies(a, b, sortOrder);
          case 'length':
            return sortByLength(a, b, sortOrder);
          case 'author':
            return sortByAuthor(a, b, sortOrder);
          case 'random':
            return sortByRandom();
          case 'normalized': {
            // Use precomputed values (already computed above)
            const scoreA = calculateNormalized(a, precomputedMaxValues!);
            const scoreB = calculateNormalized(b, precomputedMaxValues!);
            return sortOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
          }
          case 'zscore': {
            // Use precomputed values (already computed above)
            const scoreA = calculateWeightedZScore(a, precomputedStats!);
            const scoreB = calculateWeightedZScore(b, precomputedStats!);
            return sortOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
          }
          case 'bayesian': {
            // Use precomputed values (already computed above)
            const scoreA = calculateBayesianAverage(a, precomputedAvgValues!);
            const scoreB = calculateBayesianAverage(b, precomputedAvgValues!);
            return sortOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
          }
          default:
            return 0;
        }
      };

      const sortedComments = commentsToSort.sort(sortFunc);
      return sortedComments;
    },
    [applyFilters]
  );

  const getInitialSortedComments = useCallback(
    (comments: Comment[], sortBy: string, sortOrder: string) => {
      if (!sortBy || !sortOrder) return [];
      const sortedComments = sortComments(comments, sortBy, sortOrder);
      return sortedComments.slice(0, 10);
    },
    [sortComments]
  );

  const loadMoreComments = useLoadMoreComments(
    comments,
    sortComments,
    previousSortByRef,
    previousSortOrderRef
  );
  const debouncedSortComments = useDebouncedSort(getInitialSortedComments);

  return { sortComments, loadMoreComments, debouncedSortComments };
};

export default useSortedComments;
