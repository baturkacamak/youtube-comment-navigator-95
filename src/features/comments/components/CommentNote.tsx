import React, { useState, useRef, useEffect } from 'react';
import { PencilIcon } from '@heroicons/react/24/outline';
import debounce from 'lodash/debounce';
import { useTranslation } from 'react-i18next';

interface CommentNoteProps {
    note: string;
    saveNote: (note: string) => void;
}

const CommentNote: React.FC<CommentNoteProps> = ({ note: initialNote, saveNote }) => {
    const { t } = useTranslation();
    const [note, setNote] = useState(initialNote);
    const [isEditingNote, setIsEditingNote] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const noteRef = useRef(initialNote);

    useEffect(() => {
        adjustTextareaHeight();
    }, [note]);

    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newNote = e.target.value;
        setNote(newNote);
        noteRef.current = newNote;
        debouncedSaveNote();
    };

    const debouncedSaveNote = useRef(
        debounce(() => {
            saveNote(noteRef.current);
        }, 1000)
    ).current;

    return (
        <div
            className="mt-2 p-3 rounded-md flex items-start"
            onClick={() => setIsEditingNote(true)}
        >
            <PencilIcon
                className={`w-5 h-5 text-teal-800 dark:text-teal-400 transition-all duration-300 mr-2 ${isEditingNote ? 'mt-2' : 'mt-1'}`}
            />
            <textarea
                ref={textareaRef}
                value={note}
                onChange={handleNoteChange}
                onBlur={() => setIsEditingNote(false)}
                readOnly={!isEditingNote}
                className={`flex-1 border min-h-4 max-h-36 rounded resize-none overflow-hidden overflow-y-auto transition-all duration-300 ${
                    isEditingNote
                        ? 'border-gray-300 p-2 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                        : 'border-none p-0 bg-transparent cursor-pointer italic text-teal-800 dark:text-teal-400 active:outline-none active:ring-0 focus:border-0 focus:border-none focus:outline-none focus:ring-0'
                }`}
            />
        </div>
    );
};

export default CommentNote;

