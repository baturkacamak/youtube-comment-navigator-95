import {useCallback, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {setComments} from '../store/store';
import {debounce} from '../utils/debounce';

import {Comment} from "../types/commentTypes";

const useSortedComments = (initialLoadCompleted: boolean) => {
    const dispatch = useDispatch();
    const comments = useSelector((state: any) => state.comments);
    const filters = useSelector((state: any) => state.filters);
    const previousSortByRef = useRef<string | null>(null);
    const previousSortOrderRef = useRef<string | null>(null);

    const sortComments = (comments: Comment[], sortBy: string, sortOrder: string) => {
        const sortedComments = [...comments];
        switch (sortBy) {
            case 'date':
                sortedComments.sort((a, b) => {
                    return sortOrder === 'asc' ? a.publishedDate - b.publishedDate : b.publishedDate - a.publishedDate;
                });
                break;
            case 'likes':
                sortedComments.sort((a, b) => {
                    return sortOrder === 'asc' ? a.likes - b.likes : b.likes - a.likes;
                });
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
        console.timeEnd(`Sorting by ${sortBy} in ${sortOrder} order`);
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
