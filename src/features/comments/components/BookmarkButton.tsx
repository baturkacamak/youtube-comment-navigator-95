import React, { useState, useEffect } from 'react';
import { BookmarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { Comment } from "../../../types/commentTypes";
import { retrieveDataFromDB, storeDataInDB } from "../../shared/utils/cacheUtils";

interface BookmarkButtonProps {
    comment: Comment;
    commentId: string;
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({ comment, commentId }) => {
    const { t } = useTranslation();
    const [isBookmarked, setIsBookmarked] = useState(false);

    useEffect(() => {
        const checkBookmarkStatus = async () => {
            const bookmarks = await retrieveDataFromDB('bookmarks');
            setIsBookmarked(bookmarks?.some((bookmark: Comment) => bookmark.commentId === commentId));
        };
        checkBookmarkStatus();
    }, [commentId]);

    const handleBookmark = async () => {
        const bookmarks = (await retrieveDataFromDB('bookmarks')) || [];

        if (bookmarks.some((bookmark: Comment) => bookmark.commentId === commentId)) {
            const updatedBookmarks = bookmarks.filter((bookmark: Comment) => bookmark.commentId !== commentId);
            await storeDataInDB('bookmarks', updatedBookmarks);
            setIsBookmarked(false);
        } else {
            bookmarks.push(comment);
            await storeDataInDB('bookmarks', bookmarks);
            setIsBookmarked(true);
        }
    };

    return (
        <button
            onClick={handleBookmark}
            className={`flex items-center transition-all duration-300 ${isBookmarked ? 'text-yellow-600' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
            title={t('Bookmark')}
            aria-label={t('Bookmark')}
        >
            <BookmarkIcon className="w-4 h-4 mr-1" aria-hidden="true" />
            <span className="text-sm">{t('Bookmark')}</span>
        </button>
    );
};

export default BookmarkButton;
