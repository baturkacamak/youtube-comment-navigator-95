import React, { useState } from 'react';
import CommentItem from './CommentItem/CommentItem';
import { ArrowPathIcon, ExclamationCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import Box from "../../common/Box";
import { AnimatePresence, motion } from 'framer-motion';
import { getCommentBackgroundColor } from '../../../utils/colorUtils/index';
import { Comment, CommentListProps } from "../../../types/commentTypes";

const CommentList: React.FC<CommentListProps> = ({ comments, isLoading }) => {
    const [visibleCount, setVisibleCount] = useState(10);

    const loadMoreComments = () => {
        setVisibleCount(prevCount => prevCount + visibleCount);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-4 mt-4 bg-gradient-to-r from-teal-100 to-teal-300 dark:bg-gradient-to-r dark:from-gray-700 dark:to-gray-900 border-2 border-gray-400 dark:border-gray-600 rounded-lg shadow-md">
                <ArrowPathIcon className="w-16 h-16 text-gray-500 dark:text-gray-400 mb-4 animate-spin" />
                <p className="text-lg text-gray-800 dark:text-gray-200">Loading comments...</p>
            </div>
        );
    }

    if (comments.length === 0) {
        return (
            <Box className="flex flex-col items-center justify-center p-4 mt-4">
                <ExclamationCircleIcon className="w-16 h-16 text-gray-500 dark:text-gray-400 mb-4" />
                <p className="text-lg text-gray-800 dark:text-gray-200">No comments found. Try a different search or filter.</p>
            </Box>
        );
    }

    // Group comments by parentCommentId
    const commentGroups = comments.reduce((groups, comment) => {
        if (comment.replyLevel === 0) {
            groups[comment.commentId] = { comment, replies: [] };
        } else {
            const parentId = comment.commentParentId;
            if (parentId && groups[parentId]) {
                groups[parentId].replies.push(comment);
            }
        }
        return groups;
    }, {} as { [key: string]: { comment: Comment, replies: Comment[] } });

    const visibleComments = Object.values(commentGroups).slice(0, visibleCount);
    const remainingComments = Object.values(commentGroups).length - visibleCount;

    return (
        <div key={`comment-list`} className="flex flex-col">
            <AnimatePresence>
                {visibleComments.map((group, index) => {
                    const { bgColor, darkBgColor, borderColor, darkBorderColor } = getCommentBackgroundColor(group.comment, index);
                    return (
                        <motion.div
                            key={group.comment.commentId}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            layout // Add layout property to enable layout animations
                            transition={{ duration: 0.5 }}
                        >
                            <CommentItem
                                comment={group.comment}
                                replies={group.replies}
                                className="text-gray-800 dark:text-gray-200"
                                bgColor={bgColor}
                                darkBgColor={darkBgColor}
                                borderColor={borderColor}
                                darkBorderColor={darkBorderColor}
                            />
                        </motion.div>
                    );
                })}
            </AnimatePresence>
            {remainingComments > 0 && (
                <button
                    onClick={loadMoreComments}
                    className="mt-4 py-2 px-4 bg-blue-500 text-white dark:bg-blue-700 dark:text-gray-200 rounded hover:bg-blue-600 dark:hover:bg-blue-800 flex items-center justify-center"
                >
                    <ChevronDownIcon className="w-5 h-5 mr-2" />
                    Load More Comments ({remainingComments} remaining)
                </button>
            )}
        </div>
    );
};

export default CommentList;
