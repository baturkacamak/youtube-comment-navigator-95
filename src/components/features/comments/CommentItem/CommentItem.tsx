import React, {useEffect, useRef, useState} from 'react';
import Box from '../../../common/Box';
import CommentHeader from './CommentHeader';
import CommentFooter from './CommentFooter';
import CommentReplies from './CommentReplies';
import CommentBody from './CommentBody';
import useSticky from '../../../../hooks/useSticky';
import {handleCopyToClipboard} from '../../../../utils/clipboard';
import handleTimestampClick from '../../../../utils/handleTimestampClick';
import {CommentItemProps} from "../../../../types/commentTypes";

const CommentItem: React.FC<CommentItemProps> = ({
                                                     comment,
                                                     className,
                                                     replies = [],
                                                     bgColor,
                                                     darkBgColor,
                                                     borderColor,
                                                     darkBorderColor,
                                                 }) => {
    const [copySuccess, setCopySuccess] = useState(false);
    const [showReplies, setShowReplies] = useState(false);
    const [repliesHeight, setRepliesHeight] = useState('0px');
    const repliesRef = useRef<HTMLDivElement>(null);
    const parentCommentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (showReplies && repliesRef.current) {
            setRepliesHeight(`${repliesRef.current.scrollHeight}px`);
        } else {
            setRepliesHeight('0px');
        }
    }, [showReplies, replies]);

    const handleCopy = () => {
        handleCopyToClipboard(
            comment.content,
            () => {
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
            },
            (err) => {
                console.error('Could not copy text: ', err);
            }
        );
    };

    const isSticky = useSticky(parentCommentRef, showReplies);

    return (
        <Box
            className={`flex flex-col p-6 rounded-xl mb-4 shadow-lg ${className}`}
            bgColor={bgColor}
            darkBgColor={darkBgColor}
            borderColor={borderColor}
            darkBorderColor={darkBorderColor}
        >
            <div
                ref={parentCommentRef}
                id={`parent-comment-${comment.commentId}`} // Unique identifier for each comment thread
                className={`parent-comment transition-all duration-300 ${isSticky ? 'shadow-md rounded-md bg-white dark:bg-gray-800 -m-4 p-4 sticky top-24 left-0 z-10' : ''}`}
            >
                <div className="flex items-start w-full">
                    <a href={`https://www.youtube.com/channel/${comment.authorChannelId}`} target="_blank"
                       rel="noopener noreferrer" className="mr-6">
                        <img
                            src={comment.authorAvatarUrl}
                            alt={`${comment.author}'s avatar`}
                            className="w-24 h-24 rounded-full border border-gray-400 dark:border-gray-600"
                        />
                    </a>
                    <div className="flex-1">
                        <CommentHeader comment={comment}/>
                        <hr className="my-4 border-gray-400 dark:border-gray-600"/>
                        <CommentBody content={comment.content} handleTimestampClick={handleTimestampClick}/>
                        <CommentFooter
                            commentId={comment.commentId}
                            replyCount={comment.replyCount}
                            showReplies={showReplies}
                            setShowReplies={setShowReplies}
                            handleCopyToClipboard={handleCopy}
                            copySuccess={copySuccess}
                        />
                    </div>
                </div>
            </div>
            {Number(comment.replyCount) > 0 && (
                <CommentReplies
                    replies={replies}
                    showReplies={showReplies}
                    repliesRef={repliesRef}
                    repliesHeight={repliesHeight}
                />
            )}
        </Box>
    );
};

export default CommentItem;
