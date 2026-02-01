import { useDispatch } from 'react-redux';
import {
  setFilteredTranscripts,
  setIsLoading,
  setTranscripts,
  setLiveChatLoading,
  setLiveChatError,
} from '../../../store/store';
import { fetchTranscript } from '../../transcripts/services/fetchTranscript';
import { fetchCommentsFromRemote } from '../../comments/services/remote/remoteFetch';
import { fetchAndProcessLiveChat } from '../../comments/services/liveChat/fetchLiveChat';
import {
  deleteLiveChatMessages,
  deleteLiveChatReplies,
  hasLiveChatMessages,
} from '../../comments/services/liveChat/liveChatDatabase';
import { extractVideoId } from '../../comments/services/remote/utils';
import logger from '../utils/logger';
import {
  getCommentFetchErrorMessage,
  shouldShowErrorToast,
} from '../../comments/services/remote/commentErrorHandler';
import { useToast } from '../contexts/ToastContext';

const useLoadContent = (bypassCache = false) => {
  const dispatch = useDispatch();
  const { showToast } = useToast();

  const loadComments = async (bypassCache = false) => {
    dispatch(setIsLoading(true));
    try {
      await fetchCommentsFromRemote(dispatch, bypassCache);
    } catch (error: any) {
      if (shouldShowErrorToast(error)) {
        const message = getCommentFetchErrorMessage(error);
        if (message) {
          showToast({
            type: 'error',
            message,
            duration: 5000,
          });
        }
      }
    }
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

  const loadLiveChat = async (bypassCache = false) => {
    const videoId = extractVideoId();
    if (!videoId) {
      logger.warn('[useLoadContent] No videoId found for live chat');
      dispatch(setLiveChatError('No video ID found'));
      return;
    }

    try {
      dispatch(setLiveChatLoading(true));
      dispatch(setLiveChatError(null));

      // Check if live chat already exists (unless bypassing cache)
      if (!bypassCache) {
        const exists = await hasLiveChatMessages(videoId);
        if (exists) {
          logger.info('[useLoadContent] Live chat already exists in DB, skipping fetch');
          dispatch(setLiveChatLoading(false));
          return;
        }
      }

      // If bypassing cache, clean existing data
      if (bypassCache) {
        logger.info('[useLoadContent] Bypassing cache - cleaning existing live chat data');
        const deletedMessages = await deleteLiveChatMessages(videoId);
        const deletedReplies = await deleteLiveChatReplies(videoId);
        logger.info(
          `[useLoadContent] Cleaned ${deletedMessages} messages and ${deletedReplies} replies`
        );
      }

      // Fetch live chat
      const controller = new AbortController();
      await fetchAndProcessLiveChat(videoId, window, controller.signal);
      logger.success('[useLoadContent] Live chat loaded successfully');
    } catch (error: any) {
      logger.error('[useLoadContent] Failed to load live chat:', error);
      dispatch(setLiveChatError(error.message || 'Failed to load live chat'));
    } finally {
      dispatch(setLiveChatLoading(false));
    }
  };

  const loadAll = async () => {
    dispatch(setIsLoading(true));
    logger.info('[useLoadContent] Loading all content (comments, transcript, live chat)');

    // Load all content in parallel
    await Promise.allSettled([loadComments(bypassCache), loadTranscript(), loadLiveChat()]);

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
