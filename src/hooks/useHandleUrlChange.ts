// src/hooks/useHandleUrlChange.ts
import { useRef } from 'react';
import { useDispatch } from 'react-redux';
import { resetState, updateCommentsData } from '../store/store';
import { fetchContinuationTokenFromRemote } from '../services/comments/fetchContinuationData';
import { fetchCommentsFromRemote } from '../services/comments/remoteFetch';
import useUrlChange from './useUrlChange';

const useHandleUrlChange = () => {
    const dispatch = useDispatch();
    const abortController = useRef<AbortController | null>(null);

    const handleFetchedComments = (comments: any[]) => {
        dispatch(updateCommentsData({ comments, isLoading: false }));
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
    });
};

export default useHandleUrlChange;