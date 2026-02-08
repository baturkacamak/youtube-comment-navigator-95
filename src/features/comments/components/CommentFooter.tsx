import React, { useEffect, useRef } from 'react';
import {
  BanknotesIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClipboardIcon,
  ClockIcon,
  HandThumbUpIcon,
  HeartIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { Comment } from '../../../types/commentTypes';
import { extractYouTubeVideoIdFromUrl } from '../../shared/utils/extractYouTubeVideoIdFromUrl';
import Tooltip from '../../shared/components/Tooltip';
import BookmarkButton from './BookmarkButton/BookmarkButton';
import getFormattedDate from '../../settings/utils/getFormattedDate';
import ShareButton from '../../shared/components/ShareButton';
import hoverAction from '../../shared/utils/hoverAction';
import { fetchRepliesForComment } from '../services/pagination';
import logger from '../../shared/utils/logger';
import { db } from '../../shared/utils/database/database';
import { eventEmitter } from '../../shared/utils/eventEmitter';

interface CommentFooterProps {
  comment: Comment;
  showReplies: boolean;
  onToggleReplies: () => Promise<void>;
  cacheFetchedReplies: (replies: Comment[]) => void;
  isFetchingReplies: boolean;
  handleCopyToClipboard: () => void;
  copySuccess: boolean;
}

const CommentFooter: React.FC<CommentFooterProps> = React.memo(
  ({
    comment,
    showReplies,
    onToggleReplies,
    cacheFetchedReplies,
    isFetchingReplies,
    handleCopyToClipboard,
    copySuccess,
  }) => {
    const { t } = useTranslation();
    const currentVideoId = extractYouTubeVideoIdFromUrl();
    const videoId = comment.videoId || currentVideoId;

    const viewRepliesButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
      let hoverActionInstance: hoverAction | null = null;
      if (viewRepliesButtonRef.current && comment.replyCount > 0) {
        try {
          hoverActionInstance = new hoverAction({
            element: viewRepliesButtonRef.current,
            action: async () => {
              logger.start(`[RepliesHover] Fetching replies for comment: ${comment.commentId}`);
              try {
                const replies = await fetchRepliesForComment(
                  db.comments,
                  videoId,
                  comment.commentId
                );
                return replies;
              } catch (_error) {
                logger.error(
                  `[RepliesHover] Error fetching replies for comment: ${comment.commentId}`,
                  _error
                );
                // Return empty array on error to prevent UI breaking
                return [];
              } finally {
                logger.end(`[RepliesHover] Fetching replies for comment: ${comment.commentId}`);
              }
            },
            onResult: (result) => {
              try {
                if (!result || result.length === 0) {
                  return;
                }
                // Cache the fetched replies instead of dispatching
                cacheFetchedReplies(result);
                // Emit event that replies are loaded
                eventEmitter.emit(`replies-loaded-${comment.commentId}`, result);
              } catch (error) {
                logger.error(
                  `[RepliesHover] Error in onResult handler for comment: ${comment.commentId}`,
                  error
                );
              }
            },
            eventNamePrefix: 'hover-replies',
            cacheTTL: 5 * 60 * 1000, // 5 minutes cache
            triggerMode: 'delay',
            hoverDelay: 200,
            supportFocus: true,
            supportTouch: true,
            executeOnlyOnce: true,
          });
        } catch {
          // Silent catch for setup errors to avoid noise
        }
      }

      return () => {
        if (hoverActionInstance) {
          try {
            hoverActionInstance.destroy();
          } catch {
            // Silent catch for destroy errors
          }
        }
      };
    }, [comment.commentId, comment.replyCount, videoId, cacheFetchedReplies]);

    const actionClass =
      'comment-footer__action inline-flex shrink-0 items-center justify-center h-6 w-6 cq-[40rem]:h-auto cq-[40rem]:w-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white/75 dark:bg-gray-800/75 px-0 cq-[40rem]:px-2 py-0 cq-[40rem]:py-1 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300';
    const fullDate = getFormattedDate(comment.publishedDate);
    const parsedDate = new Date(comment.publishedDate);
    const compactDate = Number.isNaN(parsedDate.getTime())
      ? fullDate
      : parsedDate.toLocaleDateString(i18n.language, {
          month: 'short',
          day: 'numeric',
          ...(parsedDate.getFullYear() !== new Date().getFullYear() ? { year: '2-digit' } : {}),
        });
    const hasBadges = Boolean(
      comment.isAuthorContentCreator || comment.isDonated || comment.isHearted || comment.isMember
    );

    return (
      <div
        className="comment-footer cq flex flex-col gap-1.5 mt-2 border-solid border-t pt-2 select-none"
        aria-hidden="true"
      >
        <div className="comment-footer__content flex w-full flex-wrap items-center justify-between gap-x-1.5 gap-y-1.5">
          <div className="comment-footer__metrics inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 shrink-0">
            <div className="flex items-center">
              <HandThumbUpIcon className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
              <span className="text-xs font-semibold" aria-label={t('Likes')}>
                {comment.viewLikes || comment.likes}
              </span>
            </div>
            <div className="flex items-center">
              <ClockIcon className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
              <span className="sr-only">{fullDate}</span>
              <span className="text-xs cq-[46rem]:hidden" aria-hidden="true">
                {compactDate}
              </span>
              <span className="hidden cq-[46rem]:inline text-xs" aria-hidden="true">
                {fullDate}
              </span>
            </div>
          </div>

          <div className="comment-footer__actions inline-flex items-center gap-1 shrink-0">
            <button
              onClick={handleCopyToClipboard}
              className={actionClass}
              aria-label={t('Copy to clipboard')}
            >
              {copySuccess ? (
                <>
                  <CheckCircleIcon
                    className="w-3.5 h-3.5 mr-0 cq-[40rem]:mr-1 text-green-500 animate-pulse"
                    aria-hidden="true"
                  />
                  <span className="hidden cq-[40rem]:inline text-xs">{t('Copied')}</span>
                </>
              ) : (
                <>
                  <ClipboardIcon className="w-3.5 h-3.5 mr-0 cq-[40rem]:mr-1" aria-hidden="true" />
                  <span className="hidden cq-[40rem]:inline text-xs">{t('Copy')}</span>
                </>
              )}
            </button>
            <a
              href={`https://www.youtube.com/watch?v=${videoId}&lc=${comment.commentId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={actionClass}
              aria-label={t('Go to original comment')}
            >
              <LinkIcon className="w-3.5 h-3.5 mr-0 cq-[40rem]:mr-1" aria-hidden="true" />
              <span className="hidden cq-[40rem]:inline text-xs">{t('Original')}</span>
            </a>
            {comment.replyCount > 0 && (
              <button
                ref={viewRepliesButtonRef}
                onClick={onToggleReplies}
                className={`${actionClass} disabled:opacity-50`}
                aria-label={showReplies ? t('Hide replies') : t('Show replies')}
                disabled={isFetchingReplies}
              >
                {isFetchingReplies ? (
                  <svg
                    className="animate-spin h-3.5 w-3.5 cq-[40rem]:-ml-0.5 cq-[40rem]:mr-1.5 text-gray-600 dark:text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <ChevronDownIcon
                    className={`w-3.5 h-3.5 mr-0 cq-[40rem]:mr-1 transform transition-transform duration-300 ${
                      showReplies ? 'rotate-180' : 'rotate-0'
                    }`}
                    aria-hidden="true"
                  />
                )}
                <span className="hidden cq-[40rem]:inline text-xs">
                  {showReplies ? t('Hide replies') : t('Show replies')} ({comment.replyCount})
                </span>
              </button>
            )}
            <BookmarkButton comment={comment} />
            <ShareButton
              textToShare={comment.content}
              subject={t('Comment from YouTube')}
              url={`https://www.youtube.com/watch?v=${videoId}&lc=${comment.commentId}`}
            />
          </div>

          <a
            href={`https://www.youtube.com/channel/${comment.authorChannelId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="comment-footer__author ml-auto inline-flex min-w-0 max-w-full items-center shrink"
            aria-label={t("Go to author's channel")}
          >
            <img
              src={comment.authorAvatarUrl}
              alt={`${comment.author}'s avatar`}
              className="w-6 h-6 cq-[42rem]:w-7 cq-[42rem]:h-7 rounded-full border border-solid border-gray-400 dark:border-gray-600"
              loading="lazy"
              decoding="async"
            />
            <span className="ml-2 text-sm font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[5.5rem] cq-[30rem]:max-w-[7.5rem] cq-[38rem]:max-w-[11rem] cq-[48rem]:max-w-none">
              {comment.author}
            </span>
          </a>

          {hasBadges && (
            <div className="comment-footer__badges inline-flex items-center gap-1.5 cq-[40rem]:gap-2 shrink-0">
              {comment.isAuthorContentCreator && (
                <span
                  className="bg-blue-600 text-white text-[11px] px-2 py-0.5 rounded-full"
                  aria-label={t('Content creator')}
                >
                  {t('Creator')}
                </span>
              )}
              {comment.isDonated && (
                <span
                  className="flex items-center text-green-600 text-xs"
                  aria-label={t('Donation amount')}
                >
                  <BanknotesIcon className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                  {comment.donationAmount}
                </span>
              )}
              {comment.isHearted && (
                <Tooltip text={t('Hearted by Creator')}>
                  <span
                    className="flex items-center text-red-600 animate-pulse bg-red-100 rounded-full p-1"
                    aria-label={t('Hearted by Creator')}
                  >
                    <HeartIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                </Tooltip>
              )}
              {comment.isMember && (
                <Tooltip text={`${t('Member since')} ${comment.authorMemberSince}`}>
                  <img
                    src={comment.authorBadgeUrl}
                    alt={t('Member Badge')}
                    className="w-3.5 h-3.5"
                    aria-label={t('Member Badge')}
                    loading="lazy"
                    decoding="async"
                  />
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

CommentFooter.displayName = 'CommentFooter';

export default CommentFooter;
