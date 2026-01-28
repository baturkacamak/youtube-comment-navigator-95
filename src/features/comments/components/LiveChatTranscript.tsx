/**
 * LiveChatTranscript Component
 * Displays livechat messages in a transcript-style format with clickable timestamps
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { LiveChatTranscriptProps } from '../../../types/liveChatTypes';
import LiveChatMessageItem from './LiveChatMessageItem';
import logger from '../../shared/utils/logger';
import { useTranslation } from 'react-i18next';
import {
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import CopyButton from '../../transcripts/components/buttons/CopyButton';
import PrintButton from '../../transcripts/components/buttons/PrintButton';
import ShareButton from '../../shared/components/ShareButton';
import CheckboxFilter from '../../shared/components/CheckboxFilter';
import { DownloadAccordion } from '../../shared/components/DownloadAccordion';
import { formatTimestamp } from '../utils/liveChat/formatTimestamp';

const LiveChatTranscript: React.FC<LiveChatTranscriptProps> = ({
  messages,
  isLoading,
  onTimestampClick,
  onLoadMore,
  hasMore = false,
  fetchAllMessages,
}) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(false);

  // Generate text for export/copy
  const transcriptText = useMemo(() => {
    return messages
      .map((msg) => {
        const time =
          msg.videoOffsetTimeSec !== undefined ? formatTimestamp(msg.videoOffsetTimeSec) : '--:--';
        return `[${time}] ${msg.author}: ${msg.message}`;
      })
      .join('\n');
  }, [messages]);

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

  const handleAutoScrollChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoScroll(e.target.checked);
  };

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ArrowPathIcon className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t('Loading live chat transcript...')}</p>
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
    <div
      className="livechat-transcript flex flex-col h-full rounded"
      aria-label="Live Chat Transcript"
    >
      {/* Sticky Action Bar */}
      <div className="sticky top-0 bg-gray-100 rounded-lg py-3 px-2 dark:bg-gray-900 dark:border-gray-600 dark:border-solid dark:border mb-4 z-10 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <CopyButton textToCopy={transcriptText} />
          <DownloadAccordion
            contentType="livechat"
            visibleData={messages}
            allData={fetchAllMessages}
            fileNamePrefix="livechat"
            formatTextContent={(data) => {
              const msgs = data as typeof messages;
              return msgs
                .map((msg) => {
                  const time =
                    msg.videoOffsetTimeSec !== undefined
                      ? formatTimestamp(msg.videoOffsetTimeSec)
                      : '--:--';
                  return `[${time}] ${msg.author}: ${msg.message}`;
                })
                .join('\n');
            }}
          />
          <PrintButton transcriptText={transcriptText} />
          <ShareButton textToShare={transcriptText} />
        </div>

        <div className="flex items-center">
          <CheckboxFilter
            name={t('Auto-scroll')}
            value="auto-scroll"
            checked={autoScroll}
            onChange={handleAutoScrollChange}
            icon={<ChevronDownIcon className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Messages List */}
      <ul
        ref={scrollRef as any}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 list-none p-4 rounded-lg border border-gray-200 dark:border-gray-700"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {messages.map((message, index) => (
          <LiveChatMessageItem
            key={message.messageId}
            message={message}
            index={index}
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
      </ul>
    </div>
  );
};

export default React.memo(LiveChatTranscript);
