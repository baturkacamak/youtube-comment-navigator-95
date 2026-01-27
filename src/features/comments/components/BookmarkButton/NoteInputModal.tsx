import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CheckCircleIcon, ClockIcon, PencilIcon } from '@heroicons/react/24/outline';
import Draggable from 'react-draggable';
import { Trans, useTranslation } from 'react-i18next';
import { Comment } from '../../../../types/commentTypes';
import useNoteHandler from '../../hooks/useNoteHandler';

interface NoteInputModalProps {
  note: string | undefined;
  setNote: (note: string) => void;
  setIsNoteInputVisible: (visible: boolean) => void;
  comment: Comment;
  isNoteInputVisible: boolean; // Add this prop
  position: { top: number; left: number };
}

const NoteInputModal: React.FC<NoteInputModalProps> = ({
  note: _initialNote,
  setIsNoteInputVisible,
  isNoteInputVisible,
  comment,
  position,
}) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(true);
  const initialTextareaHeight = 'h-11';
  const [textareaHeight, setTextareaHeight] = useState(initialTextareaHeight);
  const initialCountDown = 15;
  const [countdown, setCountdown] = useState(initialCountDown);

  const handleExtraLogic = (newNote: string) => {
    initialLoadRef.current = false;
    setTextareaHeight('h-32');
    clearInterval(countdownRef.current!);

    if (newNote.length === 0) {
      setTextareaHeight(initialTextareaHeight);
    }
  };

  const { note, textareaRef, savingRef, isSaving, handleInputChange, saveNote } = useNoteHandler(
    comment,
    setIsNoteInputVisible,
    handleExtraLogic
  );

  const startHideTimeout = useCallback(() => {
    clearTimeout(timeoutRef.current!);
    timeoutRef.current = setTimeout(() => {
      setIsNoteInputVisible(false);
    }, 15000); // Hide after 15 seconds of inactivity
  }, [setIsNoteInputVisible]);

  const startCountdown = useCallback(() => {
    setCountdown(15);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          setIsNoteInputVisible(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [setIsNoteInputVisible]);

  useEffect(() => {
    if (isNoteInputVisible && textareaRef.current) {
      textareaRef.current.focus();
    }
    startHideTimeout();
  }, [isNoteInputVisible, startHideTimeout, textareaRef]);

  useEffect(() => {
    if (savingRef.current) {
      clearTimeout(timeoutRef.current!);
      clearInterval(countdownRef.current!);
      return;
    }

    if (initialLoadRef.current && note?.trim() === '') {
      startCountdown();
    }
  }, [note, startCountdown, savingRef]);

  return (
    <Draggable
      onStart={() => {
        clearInterval(countdownRef.current!);
        setIsDragging(true);
      }}
      onStop={() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }}
    >
      <div
        className={`fixed mt-2 p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-10 cursor-move`}
        style={{ top: position.top, left: position.left, overflow: 'hidden' }}
        onMouseLeave={() => {
          startHideTimeout();
        }}
      >
        <div className="flex justify-between items-center mb-2 handle">
          <span className="text-sm font-semibold dark:text-gray-300 flex items-center select-user">
            <PencilIcon className="w-4 h-4 mr-1" />
            {t('Add a note')} -{' '}
            <span className="text-gray-500 pl-px text-xs">{comment.content.slice(0, 20)}...</span>
          </span>
          <button
            onClick={() => {
              saveNote();
              setIsNoteInputVisible(false);
            }}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={note}
          onChange={handleInputChange}
          placeholder={t('Type your note here... (optional)')}
          className={`w-80 ${textareaHeight} p-2 border rounded resize-none overflow-hidden overflow-y-auto transition-all duration-300 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 custom-scrollbar`}
          rows={4}
        />
        <div
          ref={savingRef}
          className={`flex items-center transition-all duration-500 ease-in-out select-user ${
            isSaving ? 'opacity-100 max-h-10 py-4' : 'opacity-0 max-h-0'
          }`}
          style={{ maxHeight: isSaving ? savingRef.current?.scrollHeight : 0 }}
        >
          <CheckCircleIcon className="w-4 h-4 mr-1" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('Saved')}</p>
        </div>

        <div
          className={`text-sm text-gray-500 dark:text-gray-400 transition-all duration-500 ease-in-out flex items-center select-user ${initialLoadRef.current && note?.trim() === '' && !isDragging ? 'opacity-100 max-h-10 mt-2' : 'opacity-0 max-h-0 mt-0'}`}
        >
          <ClockIcon className="w-4 h-4 mr-1" />
          <Trans i18nKey="This modal will close in COUNTDOWN seconds" values={{ countdown }}>
            This modal will close in {{ countdown }} seconds
          </Trans>
        </div>
      </div>
    </Draggable>
  );
};

export default NoteInputModal;
