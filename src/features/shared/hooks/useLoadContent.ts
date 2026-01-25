import { useDispatch } from 'react-redux';
import { fetchChatReplies } from '../../comments/services/fetchComments';
import {
    setFilteredTranscripts,
    setIsLoading,
    setTranscripts,
    setLiveChatLoading,
} from "../../../store/store";
import {fetchTranscript} from "../../transcripts/services/fetchTranscript";
import {fetchCommentsFromRemote} from "../../comments/services/remote/remoteFetch";
import { fetchAndProcessLiveChat } from "../../comments/services/liveChat/fetchLiveChat";
import { extractVideoId } from "../../comments/services/remote/utils";
import logger from "../utils/logger";

const useLoadContent = (bypassCache = false) => {
    const dispatch = useDispatch();

    const loadComments = async (bypassCache = false) => {
        dispatch(setIsLoading(true));
        await fetchCommentsFromRemote(dispatch, bypassCache);
    };

    const loadTranscript = async () => {
        dispatch(setIsLoading(true));
        const data = await fetchTranscript();
        if (data && data.items) {
            dispatch(setTranscripts(data.items));
            dispatch(setFilteredTranscripts(data.items));
        } else {
            dispatch(setTranscripts([]));
        }
        dispatch(setIsLoading(false));
    };

    const loadLiveChat = async () => {
        const videoId = extractVideoId();
        if (!videoId) {
            logger.warn('[useLoadContent] No videoId found for live chat');
            return;
        }

        dispatch(setLiveChatLoading(true));
        const controller = new AbortController();

        try {
            await fetchAndProcessLiveChat(videoId, window, controller.signal, dispatch);
            logger.success('[useLoadContent] Live chat loaded successfully');
        } catch (error: any) {
            logger.error('[useLoadContent] Failed to load live chat:', error);
        } finally {
            dispatch(setLiveChatLoading(false));
        }
    };

    const loadAll = async () => {
        dispatch(setIsLoading(true));
        logger.info('[useLoadContent] Loading all content (comments, transcript, live chat)');

        // Load all content in parallel
        await Promise.allSettled([
            loadComments(bypassCache),
            loadTranscript(),
            loadLiveChat()
        ]);

        dispatch(setIsLoading(false));
        logger.success('[useLoadContent] All content loaded');
    };

    return {
        loadComments,
        loadTranscript,
        loadLiveChat,
        loadAll,
    };
};

export default useLoadContent;