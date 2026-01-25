/**
 * LiveChatMessageItem Component
 * Displays a single livechat message in transcript format with clickable timestamp
 */

import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../types/rootState';
import { LiveChatMessageItemProps } from '../../../types/liveChatTypes';
import { formatTimestamp } from '../utils/liveChat/formatTimestamp';
import handleClickTimestamp from '../utils/comments/handleClickTimestamp';
import { copyToClipboard } from '../utils/clipboard/copyToClipboard';
import { highlightText } from '../../shared/utils/highlightText';
import logger from '../../shared/utils/logger';
import { loadLiveChatReplies } from '../services/liveChat/liveChatDatabase';
import { Comment } from '../../../types/commentTypes';
import CommentReplies from './CommentReplies';
import {
  ChatBubbleBottomCenterTextIcon,
  DocumentDuplicateIcon,
  BookmarkIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartIconSolid
} from '@heroicons/react/24/solid';

interface ExtendedLiveChatMessageItemProps extends LiveChatMessageItemProps {
  index?: number;
}

const LiveChatMessageItem: React.FC<ExtendedLiveChatMessageItemProps> = ({
  message,
  index = 0,
  onTimestampClick,
  showReplies: showRepliesExternal,
  onToggleReplies
}) => {
  const textSize = useSelector((state: RootState) => state.settings.textSize);
  const keyword = useSelector((state: RootState) => state.searchKeyword);
  const fontFamily = useSelector((state: RootState) => state.settings.fontFamily);
  const [showReplies, setShowReplies] = useState(showRepliesExternal || false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const repliesRef = useRef<HTMLDivElement>(null);
  const [repliesHeight, setRepliesHeight] = useState('0px');

  // Load replies when showReplies becomes true
  useEffect(() => {
    const loadReplies = async () => {
      if (showReplies && message.hasReplies && replies.length === 0) {
        setIsLoadingReplies(true);
        try {
          logger.info(`[LiveChatMessageItem] Loading replies for message ${message.messageId}`);
          const loadedReplies = await loadLiveChatReplies(message.messageId);
          setReplies(loadedReplies);
          logger.success(`[LiveChatMessageItem] Loaded ${loadedReplies.length} replies`);
        } catch (error: any) {
          logger.error('[LiveChatMessageItem] Failed to load replies:', error);
        } finally {
          setIsLoadingReplies(false);
        }
      }
    };

    loadReplies();
  }, [showReplies, message.messageId, message.hasReplies, replies.length]);

  // Update replies height for animation
  useEffect(() => {
    if (repliesRef.current) {
      setRepliesHeight(showReplies ? `${repliesRef.current.scrollHeight}px` : '0px');
    }
  }, [showReplies, replies]);

  const handleTimestampClickInternal = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (message.videoOffsetTimeSec !== undefined) {
      event.preventDefault();
      const player = document.querySelector('#movie_player') as any;
      if (player && typeof player.seekTo === 'function') {
        player.seekTo(message.videoOffsetTimeSec, true);
        logger.info(`[LiveChatMessageItem] Seeking to ${message.videoOffsetTimeSec}s`);
      } else {
        logger.error('[LiveChatMessageItem] YouTube Player is not available');
      }

      if (onTimestampClick) {
        onTimestampClick(message.videoOffsetTimeSec);
      }
    }
  };

  const handleCopyToClipboard = () => {
    copyToClipboard(
      message.message,
      () => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      },
      (error) => {
        logger.error('[LiveChatMessageItem] Failed to copy to clipboard:', error);
      }
    );
  };

  const toggleReplies = () => {
    const newShowReplies = !showReplies;
    setShowReplies(newShowReplies);
    if (onToggleReplies) {
      onToggleReplies(message.messageId);
    }
  };

  // Format timestamp for display (e.g., "1:23:45")
  const timestampDisplay = message.videoOffsetTimeSec !== undefined
    ? formatTimestamp(message.videoOffsetTimeSec)
    : '--:--';

  return (
    <li
      className={`mb-2 flex items-center rounded-lg ${textSize} ${index % 2 === 0 ? 'bg-gray-100 dark:bg-gray-700' : 'bg-slate-50 dark:bg-gray-800'}`}
      data-message-id={message.messageId}
    >
      <div className="flex items-center w-full">
        {/* Timestamp - Clickable */}
        <span
          className="bg-stone-200 text-sm font-medium rounded text-gray-800 dark:bg-gray-500 dark:text-gray-900 px-2 py-1 mr-2 cursor-pointer hover:bg-stone-300 dark:hover:bg-gray-400 transition-colors"
          onClick={handleTimestampClickInternal}
          title={`Jump to ${timestampDisplay}`}
        >
          {timestampDisplay}
        </span>

        {/* Message Content */}
        <div className="flex-1 pb-2 -mb-2 inline-flex items-center gap-2">
          {/* Author with badges */}
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1">
            {message.author}

            {/* Badges */}
            {message.badges && message.badges.length > 0 && (
              message.badges.map((badge, idx) => (
                <img
                  key={idx}
                  src={badge.iconUrl}
                  alt={badge.label}
                  title={badge.tooltipText || badge.label}
                  className="w-4 h-4"
                />
              ))
            )}

            {message.isModerator && (
              <span className="text-xs bg-blue-500 text-white px-1 py-0.5 rounded">MOD</span>
            )}

            {message.isAuthorContentCreator && (
              <span className="text-xs bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-1 py-0.5 rounded">Creator</span>
            )}
          </span>

          {/* Message text */}
          <span
            className={`text-gray-800 dark:text-gray-300 cursor-text ${index % 2 === 0 ? 'text-black dark:text-gray-200' : 'text-gray-700 dark:text-gray-300'}`}
            style={{ fontFamily }}
          >
            {message.isDonation && message.donationAmount && (
              <span className="inline-block bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded mr-1 text-sm font-semibold">
                {message.donationAmount} {message.donationCurrency || ''}
              </span>
            )}
            {highlightText(message.message, keyword)}
          </span>

          {/* Reply count indicator */}
          {(message.replyCount || 0) > 0 && (
            <button
              onClick={toggleReplies}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 ml-auto"
            >
              <ChatBubbleBottomCenterTextIcon className="w-3 h-3" />
              {message.replyCount}
            </button>
          )}
        </div>
      </div>

      {/* Replies section */}
      {message.hasReplies && showReplies && (
        <div className="w-full mt-2 pl-8">
          <CommentReplies
            replies={replies}
            showReplies={showReplies}
            repliesRef={repliesRef}
            repliesHeight={repliesHeight}
            parentCommentId={message.messageId}
            isLoading={isLoadingReplies}
          />
        </div>
      )}
    </li>
  );
};

export default React.memo(LiveChatMessageItem);
