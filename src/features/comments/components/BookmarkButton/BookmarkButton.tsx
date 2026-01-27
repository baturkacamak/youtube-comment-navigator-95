import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookmarkIcon, BookmarkSlashIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import NoteInputModal from './NoteInputModal';
import { RootState } from '../../../../types/rootState';
import { extractYouTubeVideoIdFromUrl } from '../../../shared/utils/extractYouTubeVideoIdFromUrl';
import { getVideoTitle } from '../../../shared/utils/getVideoTitle';
import { setBookmarkedComments } from '../../../../store/store';
import { Comment } from '../../../../types/commentTypes';
import { db } from '../../../shared/utils/database/database';

interface BookmarkButtonProps {
  comment: Comment;
}

const BookmarkButton: React.FC<BookmarkButtonProps> = React.memo(({ comment }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  // Optimize selector to only listen for changes to this specific comment's bookmark status
  const bookmarkedComment = useSelector((state: RootState) =>
    state.bookmarkedComments.find((bookmark: Comment) => bookmark.commentId === comment.commentId)
  );

  const isBookmarked = !!bookmarkedComment;

  // We only need local state for the UI interaction (modal, note editing)
  const [isNoteInputVisible, setIsNoteInputVisible] = useState(false);
  const [note, setNote] = useState(bookmarkedComment?.note || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const bookmarkButtonRef = useRef<HTMLButtonElement>(null);

  // Sync note from store if it changes externally, but only if we're not currently editing (implicit via not being distinct)
  // Actually, simpler to just sync it when the store value changes.
  useEffect(() => {
    setNote(bookmarkedComment?.note || '');
  }, [bookmarkedComment?.note]);

  const handleBookmark = useCallback(async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      if (isBookmarked) {
        await db.comments.update(comment, { bookmarkAddedDate: '', note: '' });
        setIsNoteInputVisible(false);
        setNote('');
      } else {
        const videoId = extractYouTubeVideoIdFromUrl();
        const videoTitle = getVideoTitle();
        const newBookmark = {
          ...comment,
          videoId,
          videoTitle,
          isBookmarked: true,
          bookmarkAddedDate: new Date().toISOString(),
          note: '',
        };

        if (bookmarkButtonRef.current) {
          const rect = bookmarkButtonRef.current.getBoundingClientRect();
          setPosition({ top: rect.bottom, left: rect.left });
        }

        await db.comments.put(newBookmark);
        setIsNoteInputVisible(true);
      }

      // Refresh the global list
      const bookmarks = await db.comments.where('bookmarkAddedDate').notEqual('').toArray();
      dispatch(setBookmarkedComments(bookmarks));
    } catch (error) {
      console.error('Failed to update bookmark:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, isBookmarked, comment, dispatch]);

  return (
    <div className="relative">
      <button
        ref={bookmarkButtonRef}
        onClick={handleBookmark}
        disabled={isProcessing}
        className={`flex items-center transition-all duration-300 ${isBookmarked ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'} ${isProcessing ? 'cursor-not-allowed opacity-50' : ''}`}
        title={t('Bookmark')}
        aria-label={t('Bookmark')}
      >
        {isBookmarked ? (
          <BookmarkSlashIcon className="w-4 h-4 mr-1" aria-hidden="true" />
        ) : (
          <BookmarkIcon className="w-4 h-4 mr-1" aria-hidden="true" />
        )}
        <span className="text-sm">{t('Bookmark')}</span>
      </button>
      {isBookmarked && isNoteInputVisible && (
        <NoteInputModal
          note={note}
          comment={comment}
          setIsNoteInputVisible={setIsNoteInputVisible}
          isNoteInputVisible={isNoteInputVisible}
          setNote={setNote}
          position={position}
        />
      )}
    </div>
  );
});

BookmarkButton.displayName = 'BookmarkButton';

export default BookmarkButton;
