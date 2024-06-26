import React, { useState, useEffect } from 'react';
import { BookmarkIcon, BookmarkSlashIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import NoteInputModal from './NoteInputModal';
import { RootState } from "../../../../types/rootState";
import { debounce } from 'lodash';
import { extractYouTubeVideoIdFromUrl } from "../../../shared/utils/extractYouTubeVideoIdFromUrl";
import { getVideoTitle } from "../../../shared/utils/getVideoTitle";
import { storeDataInDB } from "../../../shared/utils/cacheUtils";
import { setBookmarkedComments } from "../../../../store/store";
import { Comment } from "../../../../types/commentTypes";

interface BookmarkButtonProps {
    comment: Comment;
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({ comment }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const bookmarkedComments = useSelector((state: RootState) => state.bookmarkedComments);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [bookmarkAddedDate, setBookmarkAddedDate] = useState<string | null>(null);
    const [isNoteInputVisible, setIsNoteInputVisible] = useState(false);
    const [note, setNote] = useState('');
    const [isProcessing, setIsProcessing] = useState(false); // Flag to indicate if a save operation is in progress

    useEffect(() => {
        const checkBookmarkStatus = () => {
            const bookmarkedComment = bookmarkedComments.find((bookmark: Comment) => bookmark.commentId === comment.commentId);
            if (bookmarkedComment) {
                setIsBookmarked(true);
                setBookmarkAddedDate(bookmarkedComment.bookmarkAddedDate ? new Date(bookmarkedComment.bookmarkAddedDate).toLocaleString() : null);
                setNote(bookmarkedComment.note || '');
            } else {
                setIsBookmarked(false);
                setNote('');
            }
        };
        checkBookmarkStatus();
    }, [bookmarkedComments, comment.commentId]);

    const handleBookmark = debounce(async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        let updatedBookmarks;
        if (isBookmarked) {
            updatedBookmarks = bookmarkedComments.filter((bookmark: Comment) => bookmark.commentId !== comment.commentId);
            setIsNoteInputVisible(false);
        } else {
            const videoId = extractYouTubeVideoIdFromUrl();
            const videoTitle = getVideoTitle();
            const bookmarkedComment = {
                ...comment,
                videoId,
                videoTitle,
                bookmarkAddedDate: new Date().toISOString(),
                note: ''
            };
            updatedBookmarks = [...bookmarkedComments, bookmarkedComment];
            setIsNoteInputVisible(true);
        }
        await storeDataInDB('bookmarks', updatedBookmarks);
        dispatch(setBookmarkedComments(updatedBookmarks));
        setIsProcessing(false);
    }, 300);

    return (
        <div className="relative">
            <button
                onClick={handleBookmark}
                disabled={isProcessing} // Disable the button while processing
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
                />
            )}
        </div>
    );
};

export default BookmarkButton;
