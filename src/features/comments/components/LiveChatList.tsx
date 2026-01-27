/**
 * LiveChatList Component
 * Manages fetching and displaying live chat messages using the new transcript interface
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../types/rootState';
import {
  setLiveChat,
  appendLiveChat,
  setLiveChatLoading,
  setLiveChatError,
  setLiveChatMessageCount,
} from '../../../store/store';
import { extractVideoId } from '../services/remote/utils';
import {
  loadLiveChatMessages,
  getLiveChatMessageCount,
} from '../services/liveChat/liveChatDatabase';
import LiveChatTranscript from './LiveChatTranscript';
import logger from '../../shared/utils/logger';
import { formatTimestamp } from '../utils/liveChat/formatTimestamp';

const LiveChatList: React.FC = () => {
  const dispatch = useDispatch();
  const liveChatMessages = useSelector((state: RootState) => state.liveChat);
  const liveChatState = useSelector((state: RootState) => state.liveChatState);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 100; // Messages per page

  const videoId = extractVideoId();

  // Reset page when videoId changes
  useEffect(() => {
    setPage(0);
    setHasMore(true);
  }, [videoId]);

  /**
   * Fetch all messages for export
   */
  const fetchAllMessages = async (): Promise<string> => {
    if (!videoId) return '';
    try {
      const count = await getLiveChatMessageCount(videoId);
      const messages = await loadLiveChatMessages(videoId, 0, count);
      return messages
        .map((msg) => {
          const time =
            msg.videoOffsetTimeSec !== undefined
              ? formatTimestamp(msg.videoOffsetTimeSec)
              : '--:--';
          return `[${time}] ${msg.author}: ${msg.message}`;
        })
        .join('\n');
    } catch (error) {
      logger.error('[LiveChatList] Failed to fetch all messages:', error);
      return '';
    }
  };

  /**
   * Fetch live chat messages from database with error handling
   */
  const fetchLiveChatFromDB = async () => {
    if (!videoId) {
      logger.warn('[LiveChatList] No videoId found');
      return;
    }

    // Prevent fetching if already loading, unless it's a new video (page 0 replacement)
    // We check liveChatState.isLoading, but we also need to ensure we don't block the initial load if state was stuck
    if (liveChatState.isLoading && page > 0) return;

    try {
      dispatch(setLiveChatLoading(true));
      logger.debug(`[LiveChatList] Fetching messages from database (page ${page})`);

      const offset = page * pageSize;
      const messages = await loadLiveChatMessages(videoId, offset, pageSize);
      const totalCount = await getLiveChatMessageCount(videoId);

      if (page === 0) {
        dispatch(setLiveChat(messages));
      } else {
        dispatch(appendLiveChat(messages));
      }

      dispatch(setLiveChatMessageCount(totalCount));

      // Check if there are more messages to load
      // If we loaded fewer messages than pageSize, we've reached the end
      const currentTotal = page * pageSize + messages.length;
      setHasMore(currentTotal < totalCount && messages.length === pageSize);

      logger.success(`[LiveChatList] Loaded ${messages.length} messages (total: ${totalCount})`);
    } catch (error: any) {
      logger.error('[LiveChatList] Failed to load messages from database:', error);
      dispatch(setLiveChatError(error.message || 'Failed to load live chat messages'));
    } finally {
      dispatch(setLiveChatLoading(false));
    }
  };

  /**
   * Handle timestamp click - seek video to specific time
   */
  const handleTimestampClick = (timestampSeconds: number) => {
    try {
      const player = document.querySelector('#movie_player') as any;
      if (player && typeof player.seekTo === 'function') {
        player.seekTo(timestampSeconds, true);
        logger.info(`[LiveChatList] Seeked to ${timestampSeconds}s`);
      } else {
        logger.warn('[LiveChatList] YouTube player not available');
      }
    } catch (error: any) {
      logger.error('[LiveChatList] Failed to seek video:', error);
    }
  };

  /**
   * Load more messages (pagination)
   */
  const handleLoadMore = () => {
    if (!hasMore || liveChatState.isLoading) return;

    logger.info('[LiveChatList] Loading more messages');
    setPage((prevPage) => prevPage + 1);
  };

  // Note: Live chat is now fetched automatically on URL change via useFetchDataOnUrlChange
  // This component only handles displaying the data from the database

  /**
   * Fetch messages when component mounts, page changes, or video changes
   */
  useEffect(() => {
    fetchLiveChatFromDB();
  }, [page, videoId, dispatch]);

  // Handle component mount logging
  useEffect(() => {
    logger.info('[LiveChatList] Component mounted');
    return () => {
      logger.info('[LiveChatList] Component unmounted');
    };
  }, []);

  return (
    <div className="livechat-list-container h-full">
      {liveChatState.error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline ml-2">{liveChatState.error}</span>
        </div>
      )}

      <LiveChatTranscript
        messages={liveChatMessages}
        isLoading={liveChatState.isLoading}
        onTimestampClick={handleTimestampClick}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        fetchAllMessages={fetchAllMessages}
      />
    </div>
  );
};

export default LiveChatList;
