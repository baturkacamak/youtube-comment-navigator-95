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

// Pre-computed alternating colors for bookmarked comments
const BOOKMARK_COLORS = {
  even: {
    bgColor: 'bg-gradient-to-r from-zinc-50 to-zinc-100',
    darkBgColor: 'dark:from-gray-800 dark:to-gray-900',
  },
  odd: {
    bgColor: 'bg-gradient-to-r from-stone-50 to-stone-100',
    darkBgColor: 'dark:from-gray-700 dark:to-gray-800',
  },
};

// Animation variants - no expensive 'layout' prop
const itemVariants = {
  initial: { opacity: 0, y: -5 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 5 },
};

const BookmarkedComments: React.FC<BookmarkedCommentsProps> = ({ comments }) => {
  const { t } = useTranslation();

  if (comments.length === 0) {
    return (
      <Box className="flex flex-col items-center justify-center p-4 mt-4" aria-live="polite">
        <ExclamationCircleIcon className="w-16 h-16 text-gray-500 dark:text-gray-400 mb-4" />
        <p className="text-lg text-gray-800 dark:text-gray-200">
          {t('No bookmarked comments found.')}
        </p>
      </Box>
    );
  }

  return (
    <div className="flex flex-col">
      <AnimatePresence>
        {comments.map((comment, index) => {
          const colors = index % 2 === 0 ? BOOKMARK_COLORS.even : BOOKMARK_COLORS.odd;
          return (
            <motion.div
              key={comment.commentId}
              variants={itemVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              // PERF: Removed 'layout' prop - was causing O(n) recalculations
              transition={{ duration: 0.2 }}
              role="listitem"
              aria-labelledby={`comment-${comment.commentId}`}
            >
              <CommentItem
                comment={comment}
                replies={[]}
                className="text-gray-800 dark:text-gray-200"
                bgColor={colors.bgColor}
                darkBgColor={colors.darkBgColor}
                borderColor="border-gray-300"
                darkBorderColor="dark:border-gray-600"
                videoTitle={comment.videoTitle}
                videoThumbnailUrl={`https://img.youtube.com/vi/${comment.videoId}/default.jpg`}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default BookmarkedComments;
