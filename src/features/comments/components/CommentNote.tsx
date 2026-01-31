import React, { useEffect, useState, useRef } from 'react';
import { PencilIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import useNoteHandler from '../hooks/useNoteHandler';
import { Comment } from '../../../types/commentTypes';
import Collapsible from '../../shared/components/Collapsible';

interface CommentNoteProps {
  comment: Comment;
}

const CommentNote: React.FC<CommentNoteProps> = React.memo(({ comment }) => {
  const { t } = useTranslation();
  const { note, textareaRef, isSaving, handleInputChange } = useNoteHandler(comment, () => {
    adjustTextareaHeight();
    setShowSavedMessage(true);
    setTimeout(() => {
      setShowSavedMessage(false);
    }, 2000); // Show the saved message for 2 seconds when user stops typing
  });

  const [isEditingNote, setIsEditingNote] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const initialNoteRef = useRef(note);
  const savedMessageShownRef = useRef(false);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [note]);

  const handleBlur = () => {
    setIsEditingNote(false);
    if (initialNoteRef.current !== note && !savedMessageShownRef.current) {
      setShowSavedMessage(true);
      setTimeout(() => {
        setShowSavedMessage(false);
      }, 2000); // Show the saved message for 2 seconds
    }
  };

  return (
    <div className="mt-2 p-3 rounded-md flex flex-col items-start">
      <div
        className="flex items-start w-full cursor-pointer"
        onClick={() => setIsEditingNote(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsEditingNote(true);
          }
        }}
      >
        <PencilIcon
          className={`w-5 h-5 text-teal-800 dark:text-teal-400 transition-all duration-300 mr-2 ${isEditingNote ? 'mt-2' : 'mt-1'}`}
        />
        <textarea
          ref={textareaRef}
          value={note}
          onChange={handleInputChange}
          onBlur={handleBlur}
          readOnly={!isEditingNote}
          className={`flex-1 border min-h-4 max-h-36 rounded resize-none overflow-hidden overflow-y-auto transition-all duration-300 custom-scrollbar ${
            isEditingNote
              ? 'border-gray-300 p-2 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              : 'border-none p-0 bg-transparent cursor-pointer italic text-teal-800 dark:text-teal-400 active:outline-none active:ring-0 focus:border-0 focus:border-none focus:outline-none focus:ring-0'
          }`}
        />
      </div>
      <Collapsible isOpen={isSaving || showSavedMessage}>
        <div className="flex items-center pl-8 py-4 select-user">
          <CheckCircleIcon className="w-4 h-4 mr-1" />
          <p className="text-sm text-gray-500 m-0 p-0 dark:text-gray-400">{t('Saved')}</p>
        </div>
      </Collapsible>
    </div>
  );
});

CommentNote.displayName = 'CommentNote';

export default CommentNote;
