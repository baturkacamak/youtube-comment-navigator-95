// src/hooks/useHandleUrlChange.ts
import {useRef} from 'react';
import {useDispatch} from 'react-redux';
import {resetState, setBookmarkedComments, setInitialComments, updateCommentsData} from '../../../store/store';
import {fetchContinuationTokenFromRemote} from '../../comments/services/fetchContinuationData';
import {fetchCommentsFromRemote} from '../../comments/services/remoteFetch';
import useUrlChange from './useUrlChange';
import {retrieveDataFromDB} from "../utils/cacheUtils";

const useHandleUrlChange = () => {
    const dispatch = useDispatch();
    const abortController = useRef<AbortController | null>(null);

    const handleFetchedComments = (comments: any[]) => {
        dispatch(updateCommentsData({comments, isLoading: false}));
        dispatch(setInitialComments(comments));
    };

    useUrlChange(async () => {
        if (abortController.current) {
            abortController.current.abort();
        }
        abortController.current = new AbortController();
        const signal = abortController.current.signal;

        dispatch(resetState());
        const continuationToken = await fetchContinuationTokenFromRemote();
        await fetchCommentsFromRemote(handleFetchedComments, signal, false, continuationToken);
        const bookmarks = await retrieveDataFromDB('bookmarks');
        dispatch(setBookmarkedComments(bookmarks.data || []));
    });
};

export default useHandleUrlChange;