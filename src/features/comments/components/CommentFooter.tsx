import React from 'react';
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
import { Comment } from "../../../types/commentTypes";
import { extractYouTubeVideoIdFromUrl } from "../../shared/utils/extractYouTubeVideoIdFromUrl";
import Tooltip from "../../shared/components/Tooltip";
import BookmarkButton from './BookmarkButton/BookmarkButton';
import getFormattedDate from "../../settings/utils/getFormattedDate";
import ShareButton from '../../shared/components/ShareButton';

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
    const { t } = useTranslation();
    const currentVideoId = extractYouTubeVideoIdFromUrl();
    const videoId = comment.videoId || currentVideoId; // Use stored videoId if available, otherwise use current videoId

    return (
        <div className="flex items-center justify-between space-x-2 mt-2 border-solid border-t pt-2">
            <div className="flex items-center gap-6 text-gray-600 dark:text-gray-400">
                <div className="flex items-center">
                    <HandThumbUpIcon className="w-4 h-4 mr-1" aria-hidden="true" />
                    <span className="text-sm font-bold" aria-label={t('Likes')}>
                        {comment.viewLikes || comment.likes}
                    </span>
                </div>
                <div className="flex items-center">
                    <ClockIcon className="w-4 h-4 mr-1" aria-hidden="true" />
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
                            <CheckCircleIcon className="w-4 h-4 mr-1 text-green-500 animate-pulse" aria-hidden="true" />
                            <span className="text-sm">{t('Copied')}</span>
                        </>
                    ) : (
                        <>
                            <ClipboardIcon className="w-4 h-4 mr-1" aria-hidden="true" />
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
                    <LinkIcon className="w-4 h-4 mr-1" aria-hidden="true" />
                    <span className="text-sm">{t('Original')}</span>
                </a>
                {comment.replyCount > 0 && (
                    <button
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
                <BookmarkButton comment={comment} />
                <ShareButton textToShare={comment.content} subject={t('Comment from YouTube')} url={`https://www.youtube.com/watch?v=${videoId}&lc=${comment.commentId}`} />
            </div>
            <div className="flex items-center gap-4">
                {comment.isAuthorContentCreator && (
                    <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full" aria-label={t('Content creator')}>
                        {t('Creator')}
                    </span>
                )}
                {comment.isDonated && (
                    <span className="ml-2 flex items-center text-green-600" aria-label={t('Donation amount')}>
                        <BanknotesIcon className="w-4 h-4 mr-1" aria-hidden="true" />
                        {comment.donationAmount}
                    </span>
                )}
                {comment.isHearted && (
                    <Tooltip text={t('Hearted by Creator')}>
                        <span
                            className="ml-2 flex items-center text-red-600 animate-pulse bg-red-100 rounded-full p-1"
                            aria-label={t('Hearted by Creator')}
                        >
                            <HeartIcon className="w-4 h-4" aria-hidden="true" />
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
