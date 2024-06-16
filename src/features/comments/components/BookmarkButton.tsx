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
            setIsBookmarked(bookmarks?.includes(commentId));
        };
        checkBookmarkStatus();
    }, [commentId]);

    const handleBookmark = async () => {
        const bookmarks = (await retrieveDataFromDB('bookmarks')) || [];
        let storedComments = (await retrieveDataFromDB('storedComments')) || [];

        if (bookmarks.includes(commentId)) {
            const updatedBookmarks = bookmarks.filter((id: string) => id !== commentId);
            await storeDataInDB('bookmarks', updatedBookmarks);
            setIsBookmarked(false);
        } else {
            bookmarks.push(commentId);
            await storeDataInDB('bookmarks', bookmarks);

            // Ensure the comment is stored locally
            if (!storedComments.find((storedComment: Comment) => storedComment.commentId === commentId)) {
                storedComments.push(comment);
                await storeDataInDB('storedComments', storedComments);
            }

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
