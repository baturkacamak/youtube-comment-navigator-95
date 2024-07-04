import React, { useRef } from 'react';
import { useDispatch } from 'react-redux';
import { fetchContinuationTokenFromRemote } from '../../../comments/services/fetchContinuationTokenFromRemote';
import { fetchCommentsFromRemote } from '../../../comments/services/remoteFetch';
import useDetectUrlChange from './useDetectUrlChange';
import { retrieveDataFromDB } from "../../utils/cacheUtils";
import {
    resetState,
    setBookmarkedComments,
    setFilteredTranscripts,
    setOriginalComments,
    setIsUrlChanged,
    setTranscripts,
    updateCommentsData
} from "../../../../store/store";
import { fetchTranscriptFromRemote, fetchCaptionTrackBaseUrl } from "../../../transcripts/services/remoteFetch";

const useFetchDataOnUrlChange = () => {
    const dispatch = useDispatch();
    const abortController = useRef<AbortController | null>(null);

    useDetectUrlChange(async () => {
        dispatch(setIsUrlChanged(true));
        handleAbortController(abortController);

        dispatch(resetState());

        await fetchAndSetBookmarks(dispatch);
        await fetchAndSetTranscripts(dispatch);

        const continuationToken = await fetchContinuationTokenFromRemote();
        if (abortController.current) {
            await fetchCommentsFromRemote(
                (comments) => handleFetchedComments(comments, dispatch),
                abortController.current.signal,
                false,
                continuationToken
            );
        }
    });
};

const handleAbortController = (abortControllerRef: React.MutableRefObject<AbortController | null>) => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
};

const handleFetchedComments = (comments: any[], dispatch: any) => {
    dispatch(updateCommentsData({ comments, isLoading: false }));
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
