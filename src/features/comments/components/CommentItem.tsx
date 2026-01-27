import React, { useEffect, useRef, useState } from 'react';
import Box from '../../shared/components/Box';
import CommentFooter from './CommentFooter';
import CommentReplies from './CommentReplies';
import CommentBody from './CommentBody';
import useSticky from '../../shared/hooks/useSticky';
import { copyToClipboard } from '../utils/clipboard/copyToClipboard';
import handleClickTimestamp from '../utils/comments/handleClickTimestamp';
import { CommentItemProps } from "../../../types/commentTypes";
import { useTranslation } from 'react-i18next';
import getFormattedDate from "../../settings/utils/getFormattedDate";
import { BookmarkIcon } from '@heroicons/react/24/outline';
import CommentNote from './CommentNote';
import { fetchRepliesForComment } from '../services/pagination';
import logger from '../../shared/utils/logger';
import { Comment } from "../../../types/commentTypes";
import { extractYouTubeVideoIdFromUrl } from '../../shared/utils/extractYouTubeVideoIdFromUrl';
import {db} from "../../shared/utils/database/database";
import {eventEmitter} from "../../shared/utils/eventEmitter";

const CommentItem: React.FC<CommentItemProps> = React.memo(({
                                                     comment,
                                                     className,
                                                     bgColor,
                                                     darkBgColor,
                                                     borderColor,
                                                     darkBorderColor,
                                                     videoTitle,
                                                     videoThumbnailUrl,
                                                     showRepliesDefault,
                                                 }) => {
    const { t } = useTranslation();
    const [copySuccess, setCopySuccess] = useState(false);
    const [showReplies, setShowReplies] = useState(comment.showRepliesDefault || false);
    const [fetchedReplies, setFetchedReplies] = useState<Comment[] | null>(null);
    const [isFetchingReplies, setIsFetchingReplies] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const parentCommentRef = useRef<HTMLDivElement>(null);
    const videoId = comment.videoId || extractYouTubeVideoIdFromUrl();

    useEffect(() => {
        // Create unique event name for this comment
        const eventName = `replies-loaded-${comment.commentId}`;

        // Listen for when replies are loaded through any means
        const unsubscribe = eventEmitter.on(eventName, (loadedReplies) => {
            if (loadedReplies && Array.isArray(loadedReplies)) {
                setFetchedReplies(loadedReplies);
                setError(null);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [comment.commentId]);

    const handleCopy = React.useCallback(() => {
        copyToClipboard(
            comment.content,
            () => {
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            },
            (err) => {
                logger.error('Could not copy text: ', err);
            }
        );
    }, [comment.content]);

    const cacheFetchedReplies = React.useCallback((replies: Comment[]) => {
        setFetchedReplies(prev => {
            if (prev === null) {
                return replies;
            }
            return prev;
        });
        setError(null);
    }, []);

    const handleToggleReplies = React.useCallback(async () => {
        const newShowReplies = !showReplies;
        setShowReplies(newShowReplies);

        if (newShowReplies && fetchedReplies === null) {
            setIsFetchingReplies(true);
            setError(null);
            try {
                const replies = await fetchRepliesForComment(db.comments, videoId, comment.commentId);
                setFetchedReplies(replies);
                // Emit event that replies are loaded
                eventEmitter.emit(`replies-loaded-${comment.commentId}`, replies);
            } catch (error) {
                logger.error(`[CommentItem ${comment.commentId}] Error fetching replies`, error);
                setFetchedReplies([]);
                setError(t('Failed to load replies. Please try again.'));
                eventEmitter.emit(`replies-loaded-${comment.commentId}`, []);
            } finally {
                setIsFetchingReplies(false);
            }
        }
    }, [showReplies, fetchedReplies, videoId, comment.commentId, t]);

    const isSticky = useSticky(parentCommentRef, showReplies);
    const videoUrl = `https://www.youtube.com/watch?v=${comment.videoId}`;

    const bookmarkTimestamp = comment.bookmarkAddedDate ? new Date(comment.bookmarkAddedDate).getTime() : null;

    return (
            <Box
                className={`flex flex-col rounded-lg mb-4 shadow-lg ${className}`}
                bgColor={bgColor}
                darkBgColor={darkBgColor}
                borderColor={borderColor}
                darkBorderColor={darkBorderColor}
                aria-label={t('Comment')}
            >
                <div
                    ref={parentCommentRef}
                    id={`parent-comment-${comment.commentId}`}
                    className={`parent-comment transition-all duration-300 ${isSticky ? 'shadow-md rounded-md bg-white dark:bg-gray-800 -m-2 p-2 sticky top-0 left-0 z-10' : ''}`}
                    role="article"
                    aria-labelledby={`comment-content-${comment.commentId}`}
                    aria-describedby={`comment-footer-${comment.commentId}`}
                >
                    <div className="flex items-start w-full relative">
                        {videoThumbnailUrl && (
                            <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                                <img src={videoThumbnailUrl} alt="Video Thumbnail" className="w-20 h-12 mr-4 rounded-lg" loading="lazy" decoding="async" />
                            </a>
                        )}
                        <div className="flex-1">
                            {videoTitle && (
                                <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="text-md font-semibold mb-2 block hover:underline">
                                    {videoTitle}
                                </a>
                            )}
                            <CommentBody
                                content={comment.content}
                                handleTimestampClick={handleClickTimestamp}
                            />
                            {bookmarkTimestamp && (
                                <div className="absolute -top-4 -right-4 p-2 bg-slate-400 text-white rounded-bl-lg rounded-tr-lg shadow-lg">
                                    <div className="flex items-center">
                                        <BookmarkIcon className="w-5 h-5 mr-2" />
                                        <p className="text-sm">{t('Bookmarked on:')} {getFormattedDate(bookmarkTimestamp)}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {comment.note && (
                        <CommentNote  comment={comment}/>
                    )}
                    <CommentFooter
                        comment={comment}
                        showReplies={showReplies}
                        onToggleReplies={handleToggleReplies}
                        cacheFetchedReplies={cacheFetchedReplies}
                        isFetchingReplies={isFetchingReplies}
                        handleCopyToClipboard={handleCopy}
                        copySuccess={copySuccess}
                    />
                    {error && (
                        <div className="mt-2 p-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                            {error}
                        </div>
                    )}
                </div>
                {Number(comment.replyCount) > 0 && (
                    <CommentReplies
                        replies={fetchedReplies ?? []}
                        showReplies={showReplies}
                        isLoading={isFetchingReplies}
                        parentCommentId={comment.commentId}
                    />
                )}
            </Box>
    );
});

export default CommentItem;
