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

const CommentItem: React.FC<CommentItemProps> = ({
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
        if (showReplies && repliesRef.current && fetchedReplies) {
            repliesHeight.current = `${repliesRef.current.scrollHeight}px`;
        } else {
            repliesHeight.current = '0px';
        }
    }, [showReplies, fetchedReplies]);

    const handleCopy = () => {
        copyToClipboard(
            comment.content,
            () => {
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            },
            (err) => {
                console.error('Could not copy text: ', err);
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
                const replies = await fetchRepliesForComment(videoId, comment.commentId);
                setFetchedReplies(replies);
                logger.success(`[CommentItem ${comment.commentId}] Fetched ${replies.length} replies onClick.`);
            } catch (error) {
                logger.error(`[CommentItem ${comment.commentId}] Error fetching replies onClick`, error);
                setFetchedReplies([]);
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
                                <img src={videoThumbnailUrl} alt="Video Thumbnail" className="w-20 h-12 mr-4 rounded-lg" />
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
};

export default CommentItem;
