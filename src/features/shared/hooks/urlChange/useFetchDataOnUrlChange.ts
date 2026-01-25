import React from 'react';
import { useDispatch } from 'react-redux';
import { fetchCommentsFromRemote } from '../../../comments/services/remote/remoteFetch';
import useDetectUrlChange from './useDetectUrlChange';
import {
    resetState,
    setBookmarkedComments,
    setFilteredTranscripts,
    setIsLoading,
    setTranscripts,
    setLiveChatLoading,
    setBookmarkedLiveChatMessages,
} from "../../../../store/store";
import { fetchCaptionTrackBaseUrl, fetchTranscriptFromRemote } from "../../../transcripts/services/remoteFetch";
import { fetchAndProcessLiveChat } from "../../../comments/services/liveChat/fetchLiveChat";
import { extractVideoId } from "../../../comments/services/remote/utils";
import {db} from "../../utils/database/database";
import logger from "../../utils/logger";

const useFetchDataOnUrlChange = () => {
    const dispatch = useDispatch();

    useDetectUrlChange(async () => {
        dispatch(resetState());

        await fetchAndSetBookmarks(dispatch);
        await fetchAndSetTranscripts(dispatch);
        await fetchAndSetLiveChat(dispatch); // Load live chat immediately
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

    const liveChatBookmarks = await db.liveChatMessages.where('isBookmarked').equals(1).toArray();
    if (liveChatBookmarks) {
        dispatch(setBookmarkedLiveChatMessages(liveChatBookmarks));
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

const fetchAndSetLiveChat = async (dispatch: any) => {
    const videoId = extractVideoId();
    if (!videoId) {
        logger.debug('[useFetchDataOnUrlChange] No videoId found for live chat');
        return;
    }

    try {
        // Check if live chat already exists in DB
        const existingMessages = await db.liveChatMessages
            .where('videoId')
            .equals(videoId)
            .count();

        if (existingMessages > 0) {
            logger.info(`[useFetchDataOnUrlChange] Live chat already exists (${existingMessages} messages), skipping fetch`);
            return;
        }

        // Fetch live chat in background (don't block other loads)
        dispatch(setLiveChatLoading(true));
        const controller = new AbortController();

        fetchAndProcessLiveChat(videoId, window, controller.signal, dispatch)
            .then(() => {
                logger.success('[useFetchDataOnUrlChange] Live chat loaded successfully');
            })
            .catch((error: any) => {
                if (error.name !== 'AbortError') {
                    logger.error('[useFetchDataOnUrlChange] Failed to load live chat:', error);
                }
            })
            .finally(() => {
                dispatch(setLiveChatLoading(false));
            });
    } catch (error: any) {
        logger.error('[useFetchDataOnUrlChange] Error checking for live chat:', error);
    }
};

export default useFetchDataOnUrlChange;
