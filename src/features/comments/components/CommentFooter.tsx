import React, {useEffect, useRef} from 'react';
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
import {useTranslation} from 'react-i18next';
import {Comment} from "../../../types/commentTypes";
import {extractYouTubeVideoIdFromUrl} from "../../shared/utils/extractYouTubeVideoIdFromUrl";
import Tooltip from "../../shared/components/Tooltip";
import BookmarkButton from './BookmarkButton/BookmarkButton';
import getFormattedDate from "../../settings/utils/getFormattedDate";
import ShareButton from '../../shared/components/ShareButton';
import hoverAction from "../../shared/utils/hoverAction";
import {fetchRepliesForComment} from "../services/pagination";
import logger from '../../shared/utils/logger';
import {db} from "../../shared/utils/database/database";
import {eventEmitter} from "../../shared/utils/eventEmitter";

interface CommentFooterProps {
    comment: Comment;
    showReplies: boolean;
    onToggleReplies: () => Promise<void>;
    cacheFetchedReplies: (replies: Comment[]) => void;
    isFetchingReplies: boolean;
    handleCopyToClipboard: () => void;
    copySuccess: boolean;
}

const CommentFooter: React.FC<CommentFooterProps> = React.memo(({
                                                         comment,
                                                         showReplies,
                                                         onToggleReplies,
                                                         cacheFetchedReplies,
                                                         isFetchingReplies,
                                                         handleCopyToClipboard,
                                                         copySuccess,
                                                     }) => {
    const {t} = useTranslation();
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
                            const replies = await fetchRepliesForComment(db.comments, videoId, comment.commentId);
                            logger.success(`[RepliesHover] Fetched ${replies.length} replies for comment: ${comment.commentId}`);
                            return replies;
                        } catch (error) {
                            logger.error(`[RepliesHover] Error fetching replies for comment: ${comment.commentId}`, error);
                            // Return empty array on error to prevent UI breaking
                            return [];
                        } finally {
                            logger.end(`[RepliesHover] Fetching replies for comment: ${comment.commentId}`);
                        }
                    },
                    onResult: (result) => {
                        try {
                            if (!result || result.length === 0) {
                                logger.warn(`[RepliesHover] No result returned for comment: ${comment.commentId}`);
                                return;
                            }
                            // Cache the fetched replies instead of dispatching
                            logger.info(`[RepliesHover] Caching ${result.length} replies for comment: ${comment.commentId}`);
                            cacheFetchedReplies(result);
                            // Emit event that replies are loaded
                            eventEmitter.emit(`replies-loaded-${comment.commentId}`, result);
                            logger.success(`[RepliesHover] Successfully cached replies via prop for comment: ${comment.commentId}`);
                        } catch (error) {
                            logger.error(`[RepliesHover] Error in onResult handler for comment: ${comment.commentId}`, error);
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
            } catch (error) {
                // Silent catch for setup errors to avoid noise
            }
        }

        return () => {
            if (hoverActionInstance) {
                try {
                    hoverActionInstance.destroy();
                } catch (e) {
                    // Silent catch for destroy errors
                }
            }
        };
    }, [comment.commentId, comment.replyCount, videoId, cacheFetchedReplies]);

    return (
        <div className="flex items-center justify-between space-x-2 mt-2 border-solid border-t pt-2">
            <div className="flex items-center gap-6 text-gray-600 dark:text-gray-400">
                <div className="flex items-center">
                    <HandThumbUpIcon className="w-4 h-4 mr-1" aria-hidden="true"/>
                    <span className="text-sm font-bold" aria-label={t('Likes')}>
                        {comment.viewLikes || comment.likes}
                    </span>
                </div>
                <div className="flex items-center">
                    <ClockIcon className="w-4 h-4 mr-1" aria-hidden="true"/>
                    <span className="text-sm" aria-label={t('Published date')}>
                        {getFormattedDate(comment.publishedDate)}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-6">
                <button
                    onClick={handleCopyToClipboard}
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-300"
                    title={t('Copy to clipboard')}
                    aria-label={t('Copy to clipboard')}
                >
                    {copySuccess ? (
                        <>
                            <CheckCircleIcon className="w-4 h-4 mr-1 text-green-500 animate-pulse" aria-hidden="true"/>
                            <span className="text-sm">{t('Copied')}</span>
                        </>
                    ) : (
                        <>
                            <ClipboardIcon className="w-4 h-4 mr-1" aria-hidden="true"/>
                            <span className="text-sm">{t('Copy')}</span>
                        </>
                    )}
                </button>
                <a
                    href={`https://www.youtube.com/watch?v=${videoId}&lc=${comment.commentId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    title={t('Go to original comment')}
                    aria-label={t('Go to original comment')}
                >
                    <LinkIcon className="w-4 h-4 mr-1" aria-hidden="true"/>
                    <span className="text-sm">{t('Original')}</span>
                </a>
                {comment.replyCount > 0 && (
                    <button
                        ref={viewRepliesButtonRef}
                        onClick={onToggleReplies}
                        className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-300 disabled:opacity-50"
                        title={showReplies ? t('Hide replies') : t('Show replies')}
                        aria-label={showReplies ? t('Hide replies') : t('Show replies')}
                        disabled={isFetchingReplies}
                    >
                        {isFetchingReplies ? (
                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-600 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <ChevronDownIcon
                                className={`w-4 h-4 mr-1 transform transition-transform duration-300 ${
                                    showReplies ? 'rotate-180' : 'rotate-0'
                                }`}
                                aria-hidden="true"
                            />
                        )}
                        <span className="text-sm">
                            {showReplies ? t('Hide replies') : t('Show replies')} ({comment.replyCount})
                        </span>
                    </button>
                )}
                <BookmarkButton comment={comment}/>
                <ShareButton
                    textToShare={comment.content}
                    subject={t('Comment from YouTube')}
                    url={`https://www.youtube.com/watch?v=${videoId}&lc=${comment.commentId}`}
                />
            </div>
            <div className="flex items-center gap-4">
                {comment.isAuthorContentCreator && (
                    <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full"
                          aria-label={t('Content creator')}>
                        {t('Creator')}
                    </span>
                )}
                {comment.isDonated && (
                    <span className="ml-2 flex items-center text-green-600" aria-label={t('Donation amount')}>
                        <BanknotesIcon className="w-4 h-4 mr-1" aria-hidden="true"/>
                        {comment.donationAmount}
                    </span>
                )}
                {comment.isHearted && (
                    <Tooltip text={t('Hearted by Creator')}>
                        <span className="ml-2 flex items-center text-red-600 animate-pulse bg-red-100 rounded-full p-1"
                              aria-label={t('Hearted by Creator')}>
                            <HeartIcon className="w-4 h-4" aria-hidden="true"/>
                        </span>
                    </Tooltip>
                )}
                {comment.isMember && (
                    <Tooltip text={`${t('Member since')} ${comment.authorMemberSince}`}>
                        <img
                            src={comment.authorBadgeUrl}
                            alt={t('Member Badge')}
                            className="ml-2 w-4 h-4"
                            aria-label={t('Member Badge')}
                            loading="lazy"
                            decoding="async"
                        />
                    </Tooltip>
                )}
                <a
                    href={`https://www.youtube.com/channel/${comment.authorChannelId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center"
                    aria-label={t("Go to author's channel")}
                >
                    <img
                        src={comment.authorAvatarUrl}
                        alt={`${comment.author}'s avatar`}
                        className="w-8 h-8 rounded-full border border-solid border-gray-400 dark:border-gray-600"
                        loading="lazy"
                        decoding="async"
                    />
                    <span className="ml-2 text-md font-bold text-gray-800 dark:text-gray-200">
                        {comment.author}
                    </span>
                </a>
            </div>
        </div>
    );
});

export default CommentFooter;
