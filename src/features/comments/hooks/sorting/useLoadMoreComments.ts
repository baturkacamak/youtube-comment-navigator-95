import {useCallback, useState} from 'react';
import { useDispatch } from 'react-redux';
import { Comment } from '../../../../types/commentTypes';
import {addDisplayedComments} from "../../../../store/store";

const useLoadMoreComments = (comments: Comment[], sortComments: any, previousSortByRef: any, previousSortOrderRef: any) => {
    const dispatch = useDispatch();
    const [loadedCount, setLoadedCount] = useState(10);

    const loadMoreComments = useCallback(() => {
        setLoadedCount(prevCount => {
            const newCount = prevCount + 10;
            const sortedComments = sortComments(comments, previousSortByRef.current || '', previousSortOrderRef.current || '');
            const nextComments = sortedComments.slice(prevCount, newCount);
            dispatch(addDisplayedComments(nextComments));
            return newCount;
        });
    }, [comments, dispatch, sortComments, previousSortByRef, previousSortOrderRef]);

    return loadMoreComments;
};

export default useLoadMoreComments;
