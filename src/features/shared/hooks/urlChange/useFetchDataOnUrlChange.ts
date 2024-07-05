import React from 'react';
import {useDispatch} from 'react-redux';
import {fetchContinuationTokenFromRemote} from '../../../comments/services/remote/fetchContinuationTokenFromRemote';
import {fetchCommentsFromRemote} from '../../../comments/services/remote/remoteFetch';
import useDetectUrlChange from './useDetectUrlChange';
import {retrieveDataFromDB} from "../../utils/cacheUtils";
import {
    resetState,
    setBookmarkedComments,
    setComments,
    setFilteredTranscripts, setIsLoading,
    setOriginalComments,
    setTranscripts,
} from "../../../../store/store";
import {fetchCaptionTrackBaseUrl, fetchTranscriptFromRemote} from "../../../transcripts/services/remoteFetch";

const useFetchDataOnUrlChange = () => {
    const dispatch = useDispatch();

    useDetectUrlChange(async () => {
        dispatch(resetState());

        await fetchAndSetBookmarks(dispatch);
        await fetchAndSetTranscripts(dispatch);

        const continuationToken = await fetchContinuationTokenFromRemote();
        dispatch(setIsLoading(false));
        await fetchCommentsFromRemote(
            (comments) => handleFetchedComments(comments, dispatch),
            false,
            continuationToken
        );
    });
};

const handleAbortController = (abortControllerRef: React.MutableRefObject<AbortController | null>) => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
};

const handleFetchedComments = (comments: any[], dispatch: any) => {
    dispatch(setComments(comments));
    dispatch(setOriginalComments(comments));
};

const fetchAndSetBookmarks = async (dispatch: any) => {
    const bookmarks = await retrieveDataFromDB('bookmarks');
    if (bookmarks) {
        dispatch(setBookmarkedComments(bookmarks?.data || []));
    }
};

const fetchAndSetTranscripts = async (dispatch: any) => {
    const captionTrackBaseUrl = await fetchCaptionTrackBaseUrl();
    if (captionTrackBaseUrl) {
        const transcriptData = await fetchTranscriptFromRemote(captionTrackBaseUrl);
        if (transcriptData) {
            dispatch(setTranscripts(transcriptData.items));
            dispatch(setFilteredTranscripts(transcriptData.items));
        }
    }
};

export default useFetchDataOnUrlChange;
