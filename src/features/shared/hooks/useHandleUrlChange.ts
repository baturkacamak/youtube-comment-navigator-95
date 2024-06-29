import {useRef} from 'react';
import {useDispatch} from 'react-redux';
import {fetchContinuationTokenFromRemote} from '../../comments/services/fetchContinuationData';
import {fetchCommentsFromRemote} from '../../comments/services/remoteFetch';
import useUrlChange from './useUrlChange';
import {retrieveDataFromDB} from "../utils/cacheUtils";
import {
    resetState,
    setBookmarkedComments, setFilteredTranscripts,
    setOriginalComments,
    setIsUrlChanged, setTranscripts,
    updateCommentsData
} from "../../../store/store";
import {fetchTranscriptFromRemote, fetchCaptionTrackBaseUrl} from "../../transcripts/services/remoteFetch";
import {extractYouTubeVideoIdFromUrl} from "../utils/extractYouTubeVideoIdFromUrl";

const useHandleUrlChange = () => {
    const dispatch = useDispatch();
    const abortController = useRef<AbortController | null>(null);

    const handleFetchedComments = (comments: any[]) => {
        dispatch(updateCommentsData({comments, isLoading: false}));
        dispatch(setOriginalComments(comments));
    };

    useUrlChange(async () => {
        dispatch(setIsUrlChanged(true));
        if (abortController.current) {
            abortController.current.abort();
        }
        abortController.current = new AbortController();
        const signal = abortController.current.signal;

        dispatch(resetState());
        const bookmarks = await retrieveDataFromDB('bookmarks');
        if (bookmarks) {
            dispatch(setBookmarkedComments(bookmarks?.data || []));
        }
        const captionTrackBaseUrl = await fetchCaptionTrackBaseUrl();
        if (captionTrackBaseUrl) {
            const transcriptData = await fetchTranscriptFromRemote(captionTrackBaseUrl);
            if (transcriptData) {
                dispatch(setTranscripts(transcriptData.items));
                dispatch(setFilteredTranscripts(transcriptData.items));
            }
        }
        const continuationToken = await fetchContinuationTokenFromRemote();
        await fetchCommentsFromRemote(handleFetchedComments, signal, false, continuationToken);
    });
};

export default useHandleUrlChange;
