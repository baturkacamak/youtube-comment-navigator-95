import { Comment } from '../../../../types/commentTypes';
import useDefaultFilters from './useDefaultFilters';

const useFilterComments = (filters: any) => {
    const getDefaultFilters = useDefaultFilters();

    const applyFilters = (comments: Comment[]) => {
        const defaultFilters = getDefaultFilters();

        const areFiltersDefault =
            filters.likesThreshold.min === defaultFilters.likesThreshold.min &&
            filters.likesThreshold.max === defaultFilters.likesThreshold.max &&
            filters.repliesLimit.min === defaultFilters.repliesLimit.min &&
            filters.repliesLimit.max === defaultFilters.repliesLimit.max &&
            filters.wordCount.min === defaultFilters.wordCount.min &&
            filters.wordCount.max === defaultFilters.wordCount.max &&
            filters.dateTimeRange.start === defaultFilters.dateTimeRange.start &&
            filters.dateTimeRange.end === defaultFilters.dateTimeRange.end;

        if (areFiltersDefault) {
            return comments;
        }

        return comments.filter(comment => {
            const { likesThreshold, repliesLimit, wordCount, dateTimeRange } = filters;

            const meetsLikes = comment.likes >= (likesThreshold.min || 0) &&
                comment.likes <= (likesThreshold.max || Infinity);

            const meetsReplies = comment.replyCount >= (repliesLimit.min || 0) &&
                comment.replyCount <= (repliesLimit.max || Infinity);

            const wordCountLength = comment.content.split(' ').length;
            const meetsWordCount = (wordCount.min || 0) <= wordCountLength &&
                wordCountLength <= (wordCount.max || Infinity);

            const commentDate = new Date(comment.publishedDate);
            const startDate = dateTimeRange.start ? new Date(dateTimeRange.start) : null;
            const endDate = dateTimeRange.end ? new Date(dateTimeRange.end) : null;
            const meetsDateRange = (!startDate || startDate <= commentDate) &&
                (!endDate || endDate >= commentDate);

            return meetsLikes && meetsReplies && meetsWordCount && meetsDateRange;
        });
    };

    return applyFilters;
};

export default useFilterComments;
