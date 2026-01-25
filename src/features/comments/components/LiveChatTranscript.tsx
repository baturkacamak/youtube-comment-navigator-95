/**
 * LiveChatTranscript Component
 * Displays livechat messages in a transcript-style format with clickable timestamps
 */

import React, { useState, useRef, useEffect } from 'react';
import { LiveChatTranscriptProps } from '../../../types/liveChatTypes';
import LiveChatMessageItem from './LiveChatMessageItem';
import logger from '../../shared/utils/logger';
import { useTranslation } from 'react-i18next';
import {
  ChatBubbleLeftRightIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const LiveChatTranscript: React.FC<LiveChatTranscriptProps> = ({
  messages,
  isLoading,
  onTimestampClick,
  onLoadMore,
  hasMore = false
}) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(false);

  // Auto-scroll to bottom when new messages arrive (optional)
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current || !onLoadMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;

    // Check if scrolled to bottom - load more
    if (scrollHeight - scrollTop - clientHeight < 100) {
      logger.info('[LiveChatTranscript] Near bottom, loading more messages');
      onLoadMore();
    }
  };

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {t('Loading live chat transcript...')}
          </p>
        </div>
      </div>
    );
  }

  if (!isLoading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ChatBubbleLeftRightIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
            {t('No live chat messages')}
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm">
            {t('This video does not have live chat, or it has not been loaded yet.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="livechat-transcript flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <ChatBubbleLeftRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('Live Chat Transcript')}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({messages.length} {t('messages')})
          </span>
        </div>

        {/* Auto-scroll toggle */}
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded"
          />
          <span>{t('Auto-scroll')}</span>
        </label>
      </div>

      {/* Messages List */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-white dark:bg-gray-900"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {messages.map((message) => (
          <LiveChatMessageItem
            key={message.messageId}
            message={message}
            onTimestampClick={onTimestampClick}
          />
        ))}

        {/* Loading more indicator */}
        {isLoading && messages.length > 0 && (
          <div className="flex items-center justify-center p-4">
            <ArrowPathIcon className="w-6 h-6 animate-spin text-blue-500 mr-2" />
            <span className="text-gray-600 dark:text-gray-400">
              {t('Loading more messages...')}
            </span>
          </div>
        )}

        {/* No more messages indicator */}
        {!isLoading && !hasMore && messages.length > 0 && (
          <div className="text-center p-4 text-gray-500 dark:text-gray-500 text-sm">
            {t('No more messages to load')}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(LiveChatTranscript);
