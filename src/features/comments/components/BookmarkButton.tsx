import React, { useState, useEffect } from 'react';
import { BookmarkIcon, BookmarkSlashIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../types/rootState';
import { Comment } from "../../../types/commentTypes";
import { retrieveDataFromDB, storeDataInDB } from "../../shared/utils/cacheUtils";
import { setBookmarkedComments } from '../../../store/store';

interface BookmarkButtonProps {
    comment: Comment;
    commentId: string;
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({ comment, commentId }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const bookmarkedComments = useSelector((state: RootState) => state.bookmarkedComments);
    const [isBookmarked, setIsBookmarked] = useState(false);

    useEffect(() => {
        const checkBookmarkStatus = () => {
            setIsBookmarked(bookmarkedComments.some((bookmark: Comment) => bookmark.commentId === commentId));
        };
        checkBookmarkStatus();
    }, [bookmarkedComments, commentId]);

    const handleBookmark = async () => {
        let updatedBookmarks;
        if (isBookmarked) {
            updatedBookmarks = bookmarkedComments.filter((bookmark: Comment) => bookmark.commentId !== commentId);
        } else {
            updatedBookmarks = [...bookmarkedComments, comment];
        }
        await storeDataInDB('bookmarks', updatedBookmarks);
        dispatch(setBookmarkedComments(updatedBookmarks));
    };

    return (
        <button
            onClick={handleBookmark}
            className={`flex items-center transition-all duration-300 ${isBookmarked ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
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
    );
};

export default BookmarkButton;
