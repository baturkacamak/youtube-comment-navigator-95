/**
 * LiveChatList Component
 * Manages fetching and displaying live chat messages using the new transcript interface
 */

import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../types/rootState';
import {
    setLiveChat,
    setLiveChatLoading,
    setLiveChatError,
    setLiveChatMessageCount
} from '../../../store/store';
import { extractVideoId } from '../services/remote/utils';
import { fetchAndProcessLiveChat } from '../services/liveChat/fetchLiveChat';
import {
    loadLiveChatMessages,
    getLiveChatMessageCount,
    hasLiveChatMessages,
    deleteLiveChatMessages,
    deleteLiveChatReplies
} from '../services/liveChat/liveChatDatabase';
import LiveChatTranscript from './LiveChatTranscript';
import { LiveChatMessage, LiveChatErrorType } from '../../../types/liveChatTypes';
import logger from '../../shared/utils/logger';

const LiveChatList: React.FC = () => {
    const dispatch = useDispatch();
    const liveChatMessages = useSelector((state: RootState) => state.liveChat);
    const liveChatState = useSelector((state: RootState) => state.liveChatState);

    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const pageSize = 100; // Messages per page

    const videoId = extractVideoId();

    /**
     * Fetch live chat messages from database with error handling
     */
    const fetchLiveChatFromDB = async () => {
        if (!videoId) {
            logger.warn('[LiveChatList] No videoId found');
            return;
        }

        try {
            logger.debug('[LiveChatList] Fetching messages from database');

            const offset = page * pageSize;
            const messages = await loadLiveChatMessages(videoId, offset, pageSize);
            const totalCount = await getLiveChatMessageCount(videoId);

            dispatch(setLiveChat(messages));
            dispatch(setLiveChatMessageCount(totalCount));

            // Check if there are more messages to load
            setHasMore(offset + messages.length < totalCount);

            logger.success(`[LiveChatList] Loaded ${messages.length} messages (total: ${totalCount})`);
        } catch (error: any) {
            logger.error('[LiveChatList] Failed to load messages from database:', error);
            dispatch(setLiveChatError(error.message || 'Failed to load live chat messages'));
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
        setPage(prevPage => prevPage + 1);
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
            />
        </div>
    );
};

export default LiveChatList;
