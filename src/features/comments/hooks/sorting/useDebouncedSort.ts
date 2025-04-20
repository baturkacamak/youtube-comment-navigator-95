import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { debounce } from '../../../shared/utils/debounce';
import { Comment } from '../../../../types/commentTypes';
import {setDisplayedComments} from "../../../../store/store";

const useDebouncedSort = (getInitialSortedComments: any) => {
    const dispatch = useDispatch();

    const debouncedSortComments = useCallback(
        debounce((comments: Comment[], sortBy: string, sortOrder: string) => {
            if (!sortBy || !sortOrder) return;
            const initialComments = getInitialSortedComments(comments, sortBy, sortOrder);
            dispatch(setDisplayedComments(initialComments));
        }, 300),
        [dispatch, getInitialSortedComments]
    );

    return debouncedSortComments;
};

export default useDebouncedSort;
