import React from 'react';
import { useTranslation } from 'react-i18next';
import CommentItem from './CommentItem';
import { Comment } from '../../../types/commentTypes';
import Box from '../../shared/components/Box';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';

interface BookmarkedCommentsProps {
    comments: Comment[];
}

const BookmarkedComments: React.FC<BookmarkedCommentsProps> = ({ comments }) => {
    const { t } = useTranslation();

    if (comments.length === 0) {
        return (
            <Box className="flex flex-col items-center justify-center p-4 mt-4" aria-live="polite">
                <ExclamationCircleIcon className="w-16 h-16 text-gray-500 dark:text-gray-400 mb-4" />
                <p className="text-lg text-gray-800 dark:text-gray-200">{t('No bookmarked comments found.')}</p>
            </Box>
        );
    }

    return (
        <div className="flex flex-col">
            <AnimatePresence>
                {comments.map((comment, index) => (
                    <motion.div
                        key={comment.commentId}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        layout // Add layout property to enable layout animations
                        transition={{ duration: 0.5 }}
                        role="listitem"
                        aria-labelledby={`comment-${comment.commentId}`}
                    >
                        <CommentItem
                            comment={comment}
                            replies={[]} // Add logic to fetch and display replies if necessary
                            className={`text-gray-800 dark:text-gray-200 ${index % 2 === 0 ? 'bg-teal-100 dark:bg-teal-700' : 'bg-teal-200 dark:bg-teal-900'}`}
                            bgColor={index % 2 === 0 ? 'bg-gradient-to-r from-zinc-50 to-zinc-100' : 'bg-gradient-to-r from-stone-50 to-stone-100'}
                            darkBgColor={index % 2 === 0 ? 'dark:bg-teal-700' : 'dark:bg-teal-900'}
                            borderColor="border-gray-300"
                            darkBorderColor="dark:border-gray-600"
                            videoTitle={comment.videoTitle} // Assuming videoTitle is part of the comment object
                            videoThumbnailUrl={`https://img.youtube.com/vi/${comment.videoId}/default.jpg`} // Generate thumbnail URL
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default BookmarkedComments;
