import {useCallback, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {debounce} from '../../shared/utils/debounce';
import {Comment} from "../../../types/commentTypes";
import {setComments} from "../../../store/store";

const useSortedComments = (initialLoadCompleted: boolean) => {
    const dispatch = useDispatch();
    const comments = useSelector((state: any) => state.comments);
    const filters = useSelector((state: any) => state.filters);

    const getDefaultFilters = useCallback(() => ({
        keyword: '',
        verified: false,
        hasLinks: false,
        sortBy: '',
        sortOrder: '',
        likesThreshold: {
            min: 0,
            max: Infinity,
        },
        repliesLimit: {
            min: 0,
            max: Infinity,
        },
        wordCount: {
            min: 0,
            max: Infinity,
        },
        dateTimeRange: {
            start: '',
            end: '',
        },
    }), []);

    const previousSortByRef = useRef<string | null>(null);
    const previousSortOrderRef = useRef<string | null>(null);


    const applyFilters = (comments: Comment[]) => {
        const defaultFilters = getDefaultFilters();

        // Compare current filters with default filters
        // Compare current filters with default filters for relevant keys only
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
            // Skip filtering
            return comments;
        }

        return comments.filter(comment => {
            const {likesThreshold, repliesLimit, wordCount, dateTimeRange} = filters;

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

    const calculateNormalized = (comment: Comment, maxValues: any) => {
        const likeWeight = 0.3;
        const replyWeight = 0.5;
        const wordWeight = 0.2;

        const normalizedLikes = comment.likes / maxValues.likes;
        const normalizedReplies = comment.replyCount / maxValues.replies;
        const normalizedWordCount = comment.content.split(' ').length / maxValues.wordCount;

        return (normalizedLikes * likeWeight) + (normalizedReplies * replyWeight) + (normalizedWordCount * wordWeight);
    };

    const calculateWeightedZScore = (comment: Comment, stats: any) => {
        const likeWeight = 0.3;
        const replyWeight = 0.5;
        const wordWeight = 0.2;

        const zScore = (value: number, mean: number, stdDev: number) => (value - mean) / stdDev;

        const likesZ = zScore(comment.likes, stats.likesMean, stats.likesStdDev);
        const repliesZ = zScore(comment.replyCount, stats.repliesMean, stats.repliesStdDev);
        const wordCountZ = zScore(comment.content.split(' ').length, stats.wordCountMean, stats.wordCountStdDev);

        return (likesZ * likeWeight) + (repliesZ * replyWeight) + (wordCountZ * wordWeight);
    };

    const calculateBayesianAverage = (comment: Comment, avgValues: any, m = 5) => {
        const totalEngagement = comment.likes + comment.replyCount;
        const overallAverage = avgValues.likes + avgValues.replies;
        const totalCount = comment.content.split(' ').length + m;

        return ((totalEngagement + (m * overallAverage)) / totalCount);
    };

    const sortComments = (comments: Comment[], sortBy: string, sortOrder: string, isBookmarkTab: boolean = false) => {
        const filteredComments = applyFilters(comments);
        const sortedComments = [...filteredComments];

        if (isBookmarkTab) {
            sortedComments.sort((a, b) => {
                const dateA = new Date(a.bookmarkAddedDate || '').getTime();
                const dateB = new Date(b.bookmarkAddedDate || '').getTime();
                return dateB - dateA;
            });
        }

        switch (sortBy) {
            case 'date':
                sortedComments.sort((a, b) => sortOrder === 'asc' ? a.publishedDate - b.publishedDate : b.publishedDate - a.publishedDate);
                break;
            case 'likes':
                sortedComments.sort((a, b) => sortOrder === 'asc' ? a.likes - b.likes : b.likes - a.likes);
                break;
            case 'replies':
                sortedComments.sort((a, b) => sortOrder === 'asc' ? a.replyCount - b.replyCount : b.replyCount - a.replyCount);
                break;
            case 'length':
                sortedComments.sort((a, b) => sortOrder === 'asc' ? a.content.length - b.content.length : b.content.length - a.content.length);
                break;
            case 'author':
                sortedComments.sort((a, b) => sortOrder === 'asc' ? a.author.localeCompare(b.author) : b.author.localeCompare(a.author));
                break;
            case 'random':
                sortedComments.sort(() => Math.random() - 0.5);
                break;
            case 'normalized':
                const maxValues = {
                    likes: Math.max(...comments.map(c => c.likes)),
                    replies: Math.max(...comments.map(c => c.replyCount)),
                    wordCount: Math.max(...comments.map(c => c.content.split(' ').length))
                };
                sortedComments.sort((a, b) => sortOrder === 'asc' ? calculateNormalized(a, maxValues) - calculateNormalized(b, maxValues) : calculateNormalized(b, maxValues) - calculateNormalized(a, maxValues));
                break;
            case 'zscore':
                const stats = {
                    likesMean: comments.reduce((sum, c) => sum + c.likes, 0) / comments.length,
                    likesStdDev: Math.sqrt(comments.map(c => Math.pow(c.likes - (comments.reduce((sum, c) => sum + c.likes, 0) / comments.length), 2)).reduce((a, b) => a + b) / comments.length),
                    repliesMean: comments.reduce((sum, c) => sum + c.replyCount, 0) / comments.length,
                    repliesStdDev: Math.sqrt(comments.map(c => Math.pow(c.replyCount - (comments.reduce((sum, c) => sum + c.replyCount, 0) / comments.length), 2)).reduce((a, b) => a + b) / comments.length),
                    wordCountMean: comments.reduce((sum, c) => sum + c.content.split(' ').length, 0) / comments.length,
                    wordCountStdDev: Math.sqrt(comments.map(c => Math.pow(c.content.split(' ').length - (comments.reduce((sum, c) => sum + c.content.split(' ').length, 0) / comments.length), 2)).reduce((a, b) => a + b) / comments.length)
                };
                sortedComments.sort((a, b) => sortOrder === 'asc' ? calculateWeightedZScore(a, stats) - calculateWeightedZScore(b, stats) : calculateWeightedZScore(b, stats) - calculateWeightedZScore(a, stats));
                break;
            case 'bayesian':
                const avgValues = {
                    likes: comments.reduce((sum, c) => sum + c.likes, 0) / comments.length,
                    replies: comments.reduce((sum, c) => sum + c.replyCount, 0) / comments.length
                };
                sortedComments.sort((a, b) => sortOrder === 'asc' ? calculateBayesianAverage(a, avgValues) - calculateBayesianAverage(b, avgValues) : calculateBayesianAverage(b, avgValues) - calculateBayesianAverage(a, avgValues));
                break;
            default:
                break;
        }
        return sortedComments;
    };

    const debouncedSortComments = useCallback(
        debounce((comments: Comment[], sortBy: string, sortOrder: string) => {
            if (!sortBy || !sortOrder) return;
            const sortedComments = sortComments(comments, sortBy, sortOrder);
            dispatch(setComments(sortedComments));
        }, 300),
        [dispatch]
    );

    return {sortComments};
};

export default useSortedComments;
