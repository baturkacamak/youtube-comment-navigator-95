/**
 * LiveChatMessageItem Component
 * Displays a single livechat message in transcript format with clickable timestamp
 */

import React, { useState, useRef, useEffect } from 'react';
import { LiveChatMessageItemProps } from '../../../types/liveChatTypes';
import { formatTimestamp } from '../utils/liveChat/formatTimestamp';
import handleClickTimestamp from '../utils/comments/handleClickTimestamp';
import { copyToClipboard } from '../utils/clipboard/copyToClipboard';
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

const LiveChatMessageItem: React.FC<LiveChatMessageItemProps> = ({
  message,
  onTimestampClick,
  showReplies: showRepliesExternal,
  onToggleReplies
}) => {
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

  const handleCopyToClipboard = async () => {
    try {
      await copyToClipboard(message.message);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error: any) {
      logger.error('[LiveChatMessageItem] Failed to copy to clipboard:', error);
    }
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
    : null;

  // Format published date
  const publishedDate = new Date(message.published).toLocaleString();

  return (
    <div
      className="livechat-message-item border-b border-gray-200 dark:border-gray-700 py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      data-message-id={message.messageId}
    >
      <div className="flex gap-3">
        {/* Timestamp - Clickable */}
        <div className="flex-shrink-0 w-16 text-right">
          {timestampDisplay ? (
            <a
              href="#"
              data-timestamp={timestampDisplay}
              onClick={handleTimestampClickInternal}
              className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-sm cursor-pointer"
              title={`Jump to ${timestampDisplay}`}
            >
              {timestampDisplay}
            </a>
          ) : (
            <span className="text-gray-400 dark:text-gray-600 font-mono text-sm">--:--</span>
          )}
        </div>

        {/* Avatar */}
        <div className="flex-shrink-0">
          <img
            src={message.authorAvatarUrl}
            alt={message.author}
            className="w-8 h-8 rounded-full"
          />
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Author and Badges */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`font-semibold text-sm ${
                message.isAuthorContentCreator
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {message.author}
            </span>

            {/* Badges */}
            {message.badges && message.badges.length > 0 && (
              <div className="flex gap-1">
                {message.badges.map((badge, idx) => (
                  <img
                    key={idx}
                    src={badge.iconUrl}
                    alt={badge.label}
                    title={badge.tooltipText || badge.label}
                    className="w-4 h-4"
                  />
                ))}
              </div>
            )}

            {message.isModerator && (
              <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded">
                MOD
              </span>
            )}

            {message.isVerified && (
              <span className="text-xs bg-gray-500 text-white px-1.5 py-0.5 rounded">
                ✓
              </span>
            )}

            {message.isAuthorContentCreator && (
              <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded">
                Creator
              </span>
            )}
          </div>

          {/* Message Text */}
          <div className="text-sm text-gray-800 dark:text-gray-200 break-words">
            {message.isDonation && message.donationAmount && (
              <div className="inline-block bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded mr-2 mb-1 font-semibold">
                {message.donationAmount} {message.donationCurrency || ''}
              </div>
            )}
            {message.message}
          </div>

          {/* Note if bookmarked */}
          {message.isBookmarked && message.note && (
            <div className="mt-2 text-xs bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-2">
              <div className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                Note:
              </div>
              <div className="text-gray-700 dark:text-gray-300">{message.note}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-2">
            {/* Copy */}
            <button
              onClick={handleCopyToClipboard}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 text-xs"
              title="Copy message"
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
              {copySuccess && <span className="text-green-600">Copied!</span>}
            </button>

            {/* Replies */}
            {(message.hasReplies || message.replyCount) && (
              <button
                onClick={toggleReplies}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 text-xs"
              >
                <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
                <span>{message.replyCount || 0}</span>
                <span>{showReplies ? '▲' : '▼'}</span>
              </button>
            )}

            {/* Bookmark indicator */}
            {message.isBookmarked && (
              <div className="text-yellow-500 flex items-center gap-1 text-xs">
                <BookmarkIcon className="w-4 h-4 fill-current" />
              </div>
            )}

            {/* Published time */}
            <span className="text-xs text-gray-400 dark:text-gray-600 ml-auto">
              {publishedDate}
            </span>
          </div>

          {/* Replies */}
          {message.hasReplies && (
            <CommentReplies
              replies={replies}
              showReplies={showReplies}
              repliesRef={repliesRef}
              repliesHeight={repliesHeight}
              parentCommentId={message.messageId}
              isLoading={isLoadingReplies}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(LiveChatMessageItem);
