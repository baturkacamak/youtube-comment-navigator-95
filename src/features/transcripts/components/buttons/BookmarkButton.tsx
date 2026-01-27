import React from 'react';
import { BookmarkIcon, BookmarkSlashIcon } from '@heroicons/react/24/outline';
import Tooltip from '../../../shared/components/Tooltip';

interface BookmarkButtonProps {
  isBookmarked: boolean;
  isVisible: boolean;
  toggleBookmark: () => void;
  bookmarkAddedDate?: string | null; // Added prop for the bookmark date
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  isBookmarked,
  isVisible,
  toggleBookmark,
  bookmarkAddedDate,
}) => {
  return (
    <Tooltip text={isBookmarked ? `Bookmarked on: ${bookmarkAddedDate}` : 'Add Bookmark'}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleBookmark();
        }}
        className={`ml-2 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        aria-label={isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
      >
        {isBookmarked ? (
          <BookmarkSlashIcon className="w-5 h-5 text-yellow-500 hover:text-yellow-600" />
        ) : (
          <BookmarkIcon className="w-5 h-5 text-gray-500 hover:text-yellow-500" />
        )}
      </button>
    </Tooltip>
  );
};

export default BookmarkButton;
