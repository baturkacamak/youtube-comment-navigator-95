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
import {
  HeartIcon as HeartIconSolid,
  ChatBubbleBottomCenterTextIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/solid';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';

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
    const repliesHeight = useRef('0px');
    const repliesRef = useRef<HTMLDivElement>(null);
    const parentCommentRef = useRef<HTMLDivElement>(null);
    const videoId = comment.videoId || extractYouTubeVideoIdFromUrl();

    useEffect(() => {
        if (showReplies && repliesRef.current) {
            // Add a small delay to ensure the content has rendered
            const recalculateHeight = () => {
                if (repliesRef.current) {
                    repliesHeight.current = `${repliesRef.current.scrollHeight}px`;
                    // Force re-render to apply the new height
                    setShowReplies(prev => !!prev);
                }
            };

            if (fetchedReplies && fetchedReplies.length > 0) {
                // If replies are already loaded, recalculate immediately
                recalculateHeight();
            } else {
                // If replies aren't loaded yet, set a temporary reasonable height
                repliesHeight.current = comment.replyCount ? `${comment.replyCount * 100}px` : '0px';
            }
        } else {
            repliesHeight.current = '0px';
        }
    }, [showReplies, fetchedReplies, comment.replyCount]);

    useEffect(() => {
        // Create unique event name for this comment
        const eventName = `replies-loaded-${comment.commentId}`;

        // Listen for when replies are loaded through any means
        const unsubscribe = eventEmitter.on(eventName, (loadedReplies) => {
            if (loadedReplies && Array.isArray(loadedReplies)) {
                setFetchedReplies(loadedReplies);
                // Force recalculation of height in next tick to ensure DOM is updated
                setTimeout(() => {
                    if (repliesRef.current) {
                        repliesHeight.current = `${repliesRef.current.scrollHeight}px`;
                        // Force a re-render to apply the new height
                        setShowReplies(prev => prev);
                    }
                }, 0);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [comment.commentId]);

    const handleCopy = () => {
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
    };

    const cacheFetchedReplies = (replies: Comment[]) => {
        if (fetchedReplies === null) {
            logger.info(`[CommentItem ${comment.commentId}] Caching ${replies.length} replies from hover.`);
            setFetchedReplies(replies);
        }
    };

    const handleToggleReplies = async () => {
        const newShowReplies = !showReplies;
        setShowReplies(newShowReplies);

        if (newShowReplies && fetchedReplies === null) {
            setIsFetchingReplies(true);
            try {
                logger.info(`[CommentItem ${comment.commentId}] Fetching replies onClick...`);
                const replies = await fetchRepliesForComment(db.comments, videoId, comment.commentId);
                setFetchedReplies(replies);
                // Emit event that replies are loaded
                eventEmitter.emit(`replies-loaded-${comment.commentId}`, replies);
                logger.success(`[CommentItem ${comment.commentId}] Fetched ${replies.length} replies onClick.`);
            } catch (error) {
                logger.error(`[CommentItem ${comment.commentId}] Error fetching replies onClick`, error);
                setFetchedReplies([]);
                eventEmitter.emit(`replies-loaded-${comment.commentId}`, []);
            } finally {
                setIsFetchingReplies(false);
            }
        }
    };

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
                </div>
                {Number(comment.replyCount) > 0 && (
                    <CommentReplies
                        replies={fetchedReplies ?? []}
                        showReplies={showReplies}
                        repliesRef={repliesRef}
                        repliesHeight={repliesHeight.current}
                        isLoading={isFetchingReplies}
                        parentCommentId={comment.commentId}
                    />
                )}
            </Box>
    );
});

export default CommentItem;
