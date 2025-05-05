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
import {setReplies} from "../../../store/store";
import {fetchRepliesForComment} from "../services/pagination";
import {useDispatch} from "react-redux";
import logger from '../../shared/utils/logger';

interface CommentFooterProps {
    comment: Comment;
    showReplies: boolean;
    setShowReplies: (show: boolean) => void;
    handleCopyToClipboard: () => void;
    copySuccess: boolean;
}

const CommentFooter: React.FC<CommentFooterProps> = ({
                                                         comment,
                                                         showReplies,
                                                         setShowReplies,
                                                         handleCopyToClipboard,
                                                         copySuccess,
                                                     }) => {
    const {t} = useTranslation();
    const currentVideoId = extractYouTubeVideoIdFromUrl();
    const videoId = comment.videoId || currentVideoId;
    const dispatch = useDispatch();

    const viewRepliesButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (viewRepliesButtonRef.current && comment.replyCount > 0) {
            logger.start(`[CommentFooter] Setting up hoverAction for comment: ${comment.commentId}`);
            try {
                new hoverAction({
                    element: viewRepliesButtonRef.current,
                    action: async () => {
                        logger.start(`[RepliesHover] Fetching replies for comment: ${comment.commentId}`);
                        try {
                            const replies = await fetchRepliesForComment(videoId, comment.commentId);
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
                            if (!result) {
                                logger.warn(`[RepliesHover] No result returned for comment: ${comment.commentId}`);
                                return;
                            }

                            if (result.length > 0) {
                                logger.info(`[RepliesHover] Dispatching ${result.length} replies to Redux store for comment: ${comment.commentId}`);
                                dispatch(setReplies(result));
                                logger.success(`[RepliesHover] Successfully cached replies for comment: ${comment.commentId}`);
                            } else {
                                logger.info(`[RepliesHover] No replies to dispatch for comment: ${comment.commentId} (expected ${comment.replyCount})`);
                            }
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
                logger.success(`[CommentFooter] HoverAction setup complete for comment: ${comment.commentId}`);
            } catch (error) {
                logger.error(`[CommentFooter] Error setting up hoverAction for comment: ${comment.commentId}`, error);
            } finally {
                logger.end(`[CommentFooter] Setting up hoverAction for comment: ${comment.commentId}`);
            }
        } else if (comment.replyCount === 0) {
            logger.info(`[CommentFooter] No replies to prefetch for comment: ${comment.commentId}`);
        } else if (!viewRepliesButtonRef.current) {
            logger.warn(`[CommentFooter] Button ref not available for comment: ${comment.commentId}`);
        }
    }, [comment.commentId, comment.replyCount, videoId, dispatch]);

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
                        onClick={() => setShowReplies(!showReplies)}
                        className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-300"
                        title={showReplies ? t('Hide replies') : t('Show replies')}
                        aria-label={showReplies ? t('Hide replies') : t('Show replies')}
                    >
                        <ChevronDownIcon
                            className={`w-4 h-4 mr-1 transform transition-transform duration-300 ${
                                showReplies ? 'rotate-180' : 'rotate-0'
                            }`}
                            aria-hidden="true"
                        />
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
                    />
                    <span className="ml-2 text-md font-bold text-gray-800 dark:text-gray-200">
                        {comment.author}
                    </span>
                </a>
            </div>
        </div>
    );
};

export default CommentFooter;
