import { useCallback, useMemo } from 'react';
import { Comment } from '../../../../types/commentTypes';
import useDefaultFilters from './useDefaultFilters';

const useFilterComments = (filters: any) => {
  const getDefaultFilters = useDefaultFilters();

  // Memoize default filters to avoid recalculation
  const defaultFilters = useMemo(() => getDefaultFilters(), [getDefaultFilters]);

  // Memoize filter state check
  const areFiltersDefault = useMemo(
    () =>
      filters.likesThreshold.min === defaultFilters.likesThreshold.min &&
      filters.likesThreshold.max === defaultFilters.likesThreshold.max &&
      filters.repliesLimit.min === defaultFilters.repliesLimit.min &&
      filters.repliesLimit.max === defaultFilters.repliesLimit.max &&
      filters.wordCount.min === defaultFilters.wordCount.min &&
      filters.wordCount.max === defaultFilters.wordCount.max &&
      filters.dateTimeRange.start === defaultFilters.dateTimeRange.start &&
      filters.dateTimeRange.end === defaultFilters.dateTimeRange.end,
    [filters, defaultFilters]
  );

  // Memoize filter function to prevent unnecessary re-renders in dependent hooks
  const applyFilters = useCallback(
    (comments: Comment[]) => {
      if (areFiltersDefault) {
        return comments;
      }

      const { likesThreshold, repliesLimit, wordCount, dateTimeRange } = filters;

      // Pre-parse dates once instead of per-comment
      const startDate = dateTimeRange.start ? new Date(dateTimeRange.start).getTime() : null;
      const endDate = dateTimeRange.end ? new Date(dateTimeRange.end).getTime() : null;

      return comments.filter((comment) => {
        const meetsLikes =
          comment.likes >= (likesThreshold.min || 0) &&
          comment.likes <= (likesThreshold.max || Infinity);

        const meetsReplies =
          comment.replyCount >= (repliesLimit.min || 0) &&
          comment.replyCount <= (repliesLimit.max || Infinity);

        // Use cached wordCount instead of splitting content
        const wc = comment.wordCount ?? 0;
        const meetsWordCount = (wordCount.min || 0) <= wc && wc <= (wordCount.max || Infinity);

        // Use pre-parsed dates for faster comparison
        const meetsDateRange =
          (!startDate || startDate <= comment.publishedDate) &&
          (!endDate || endDate >= comment.publishedDate);

        return meetsLikes && meetsReplies && meetsWordCount && meetsDateRange;
      });
    },
    [areFiltersDefault, filters]
  );

  return applyFilters;
};

export default useFilterComments;
