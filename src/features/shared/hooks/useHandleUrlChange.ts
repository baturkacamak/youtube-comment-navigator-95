import {useRef} from 'react';
import {useDispatch} from 'react-redux';
import {fetchContinuationTokenFromRemote} from '../../comments/services/fetchContinuationData';
import {fetchCommentsFromRemote} from '../../comments/services/remoteFetch';
import useUrlChange from './useUrlChange';
import {retrieveDataFromDB} from "../utils/cacheUtils";
import {
    resetState,
    setBookmarkedComments,
    setInitialComments,
    setIsUrlChanged,
    updateCommentsData
} from "../../../store/store";

const useHandleUrlChange = () => {
    const dispatch = useDispatch();
    const abortController = useRef<AbortController | null>(null);

    const handleFetchedComments = (comments: any[]) => {
        dispatch(updateCommentsData({comments, isLoading: false}));
        dispatch(setInitialComments(comments));
    };

    useUrlChange(async () => {
        dispatch(setIsUrlChanged(true));
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
