import React from 'react';
import { BookmarkIcon, BookmarkSlashIcon } from '@heroicons/react/24/outline';

interface BookmarkButtonProps {
    isBookmarked: boolean;
    onToggleBookmark: () => void;
    isVisible: boolean; // New prop to control visibility
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({ isBookmarked, onToggleBookmark, isVisible }) => {
    return (
        <button
            onClick={onToggleBookmark}
            className={`ml-2 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            aria-label={isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
        >
            {isBookmarked ? (
                <BookmarkSlashIcon className="w-5 h-5 text-yellow-500" />
            ) : (
                <BookmarkIcon className="w-5 h-5 text-gray-500 hover:text-yellow-500" />
            )}
        </button>
    );
};

export default BookmarkButton;
