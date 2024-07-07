import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Comment } from '../../../../types/commentTypes';
import useFilterComments from './useFilterComments';
import useLoadMoreComments from './useLoadMoreComments';
import useDebouncedSort from './useDebouncedSort';
import sortByDate from "./normal/sortByDate";
import sortByLikes from "./normal/sortByLikes";
import sortByReplies from "./normal/sortByReplies";
import sortByLength from "./normal/sortByLength";
import sortByAuthor from "./normal/sortByAuthor";
import sortByRandom from "./normal/sortByRandom";
import { calculateNormalized, getMaxValues } from './advanced/calculateNormalized';
import { calculateWeightedZScore, getStats } from './advanced/calculateWeightedZScore';
import { calculateBayesianAverage, getAvgValues } from './advanced/calculateBayesianAverage';

const useSortedComments = (initialLoadCompleted: boolean) => {
    const dispatch = useDispatch();
    const comments = useSelector((state: any) => state.comments);
    const filters = useSelector((state: any) => state.filters);

    const applyFilters = useFilterComments(filters);
    const previousSortByRef = useRef<string | null>(null);
    const previousSortOrderRef = useRef<string | null>(null);

    const sortComments = useCallback((comments: Comment[], sortBy: string, sortOrder: string) => {
        const filteredComments = applyFilters(comments);
        const commentsToSort = [...filteredComments];

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
                case 'normalized':
                    const maxValues = getMaxValues(commentsToSort);
                    return sortOrder === 'asc' ? calculateNormalized(a, maxValues) - calculateNormalized(b, maxValues) : calculateNormalized(b, maxValues) - calculateNormalized(a, maxValues);
                case 'zscore':
                    const stats = getStats(commentsToSort);
                    return sortOrder === 'asc' ? calculateWeightedZScore(a, stats) - calculateWeightedZScore(b, stats) : calculateWeightedZScore(b, stats) - calculateWeightedZScore(a, stats);
                case 'bayesian':
                    const avgValues = getAvgValues(commentsToSort);
                    return sortOrder === 'asc' ? calculateBayesianAverage(a, avgValues) - calculateBayesianAverage(b, avgValues) : calculateBayesianAverage(b, avgValues) - calculateBayesianAverage(a, avgValues);
                default:
                    return 0;
            }
        };

        return commentsToSort.sort(sortFunc);
    }, [applyFilters, calculateNormalized, getMaxValues, calculateWeightedZScore, getStats, calculateBayesianAverage, getAvgValues, sortByDate, sortByLikes, sortByReplies, sortByLength, sortByAuthor, sortByRandom]);

    const getInitialSortedComments = useCallback(
        (comments: Comment[], sortBy: string, sortOrder: string) => {
            if (!sortBy || !sortOrder) return [];
            const sortedComments = sortComments(comments, sortBy, sortOrder);
            return sortedComments.slice(0, 10);
        },
        [sortComments]
    );

    const loadMoreComments = useLoadMoreComments(comments, sortComments, previousSortByRef, previousSortOrderRef);
    const debouncedSortComments = useDebouncedSort(getInitialSortedComments);

    return { sortComments, loadMoreComments, debouncedSortComments };
};

export default useSortedComments;