import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { debounce } from '../../shared/utils/debounce';
import { Comment } from "../../../types/commentTypes";
import { setComments } from "../../../store/store";

const useSortedComments = (initialLoadCompleted: boolean) => {
    const dispatch = useDispatch();
    const comments = useSelector((state: any) => state.comments);
    const filters = useSelector((state: any) => state.filters);
    const previousSortByRef = useRef<string | null>(null);
    const previousSortOrderRef = useRef<string | null>(null);

    const applyFilters = (comments: Comment[]) => {
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

    return { sortComments };
};

export default useSortedComments;
