import React from 'react';
import { useDispatch } from 'react-redux';
import { fetchCommentsFromRemote } from '../../../comments/services/remote/remoteFetch';
import useDetectUrlChange from './useDetectUrlChange';
import {
    resetState,
    setBookmarkedComments,
    setFilteredTranscripts, setIsLoading,
    setTranscripts,
} from "../../../../store/store";
import { fetchCaptionTrackBaseUrl, fetchTranscriptFromRemote } from "../../../transcripts/services/remoteFetch";
import {db} from "../../utils/database/database";

const useFetchDataOnUrlChange = () => {
    const dispatch = useDispatch();

    useDetectUrlChange(async () => {
        dispatch(resetState());

        await fetchAndSetBookmarks(dispatch);
        await fetchAndSetTranscripts(dispatch);
        dispatch(setIsLoading(false));
        await fetchCommentsFromRemote(
            dispatch,
            false
        );
    });
};

const handleAbortController = (abortControllerRef: React.MutableRefObject<AbortController | null>) => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
};

const fetchAndSetBookmarks = async (dispatch: any) => {
    const bookmarks = await db.comments.where('isBookmarked').equals(1).toArray();
    if (bookmarks) {
        dispatch(setBookmarkedComments(bookmarks));
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
