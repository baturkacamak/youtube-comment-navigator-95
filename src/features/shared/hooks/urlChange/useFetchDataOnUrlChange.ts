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
} from '../../../../store/store';
import {
  fetchCaptionTrackBaseUrl,
  fetchTranscriptFromRemote,
} from '../../../transcripts/services/remoteFetch';
import { fetchAndProcessLiveChat } from '../../../comments/services/liveChat/fetchLiveChat';
import { extractVideoId } from '../../../comments/services/remote/utils';
import { db } from '../../utils/database/database';
import logger from '../../utils/logger';
import { seedMockData } from '../../utils/mockDataSeeder';
import { isLocalEnvironment } from '../../utils/appConstants';
import {
  getCommentFetchErrorMessage,
  shouldShowErrorToast,
} from '../../../comments/services/remote/commentErrorHandler';
import {
  getTranscriptFetchErrorMessage,
  shouldShowTranscriptErrorToast,
} from '../../../transcripts/services/transcriptErrorHandler';
import {
  getLiveChatFetchErrorMessage,
  shouldShowLiveChatErrorToast,
} from '../../../comments/services/liveChat/liveChatErrorHandler';
import { useToast } from '../../contexts/ToastContext';

const useFetchDataOnUrlChange = () => {
  const dispatch = useDispatch();
  const { showToast } = useToast();

  useDetectUrlChange(async () => {
    logger.info('[useFetchDataOnUrlChange] URL Change Detected');
    dispatch(resetState());

    const isLocal = isLocalEnvironment();
    const hostname = window.location.hostname;
    logger.info(
      `[useFetchDataOnUrlChange] Environment check: isLocal=${isLocal}, hostname=${hostname}`
    );

    if (isLocal && (hostname === 'localhost' || hostname === '127.0.0.1')) {
      logger.info('[useFetchDataOnUrlChange] Triggering Mock Data Seeder');
      await seedMockData(dispatch);
      return;
    }

    await fetchAndSetBookmarks(dispatch);
    await fetchAndSetTranscripts(dispatch, showToast);
    await fetchAndSetLiveChat(dispatch, showToast); // Load live chat immediately
    dispatch(setIsLoading(false));

    try {
      await fetchCommentsFromRemote(dispatch, false);
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
  });
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

const fetchAndSetTranscripts = async (
  dispatch: any,
  showToast: (toast: {
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    duration?: number;
  }) => void
) => {
  try {
    const captionTrackBaseUrl = await fetchCaptionTrackBaseUrl();
    if (captionTrackBaseUrl) {
      const transcriptData = await fetchTranscriptFromRemote(captionTrackBaseUrl);
      if (transcriptData) {
        dispatch(setTranscripts(transcriptData.items));
        dispatch(setFilteredTranscripts(transcriptData.items));
      }
    }
  } catch (error: any) {
    if (shouldShowTranscriptErrorToast(error)) {
      const message = getTranscriptFetchErrorMessage(error);
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

const fetchAndSetLiveChat = async (
  dispatch: any,
  showToast: (toast: {
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    duration?: number;
  }) => void
) => {
  const videoId = extractVideoId();
  if (!videoId) {
    logger.debug('[useFetchDataOnUrlChange] No videoId found for live chat');
    return;
  }

  try {
    // Check if live chat already exists in DB
    const existingMessages = await db.liveChatMessages.where('videoId').equals(videoId).count();

    if (existingMessages > 0) {
      logger.info(
        `[useFetchDataOnUrlChange] Live chat already exists (${existingMessages} messages), skipping fetch`
      );
      return;
    }

    // Fetch live chat in background (don't block other loads)
    dispatch(setLiveChatLoading(true));
    const controller = new AbortController();

    fetchAndProcessLiveChat(videoId, window, controller.signal)
      .then(() => {
        logger.success('[useFetchDataOnUrlChange] Live chat loaded successfully');
      })
      .catch((error: any) => {
        if (error.name !== 'AbortError') {
          logger.error('[useFetchDataOnUrlChange] Failed to load live chat:', error);

          if (shouldShowLiveChatErrorToast(error)) {
            const message = getLiveChatFetchErrorMessage(error);
            if (message) {
              showToast({
                type: 'error',
                message,
                duration: 5000,
              });
            }
          }
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
