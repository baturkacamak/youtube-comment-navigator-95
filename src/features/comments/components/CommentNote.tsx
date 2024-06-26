import React, {useEffect, useState} from 'react';
import {PencilIcon} from '@heroicons/react/24/outline';
import {useTranslation} from 'react-i18next';
import useNoteHandler from "../hooks/useNoteHandler";
import {Comment} from "../../../types/commentTypes";

interface CommentNoteProps {
    comment: Comment;
}

const CommentNote: React.FC<CommentNoteProps> = ({comment}) => {
    const {t} = useTranslation();
    const {
        note,
        textareaRef,
        handleInputChange,
    } = useNoteHandler(comment, () => {
        adjustTextareaHeight();
    });

    const [isEditingNote, setIsEditingNote] = useState(false);

    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    useEffect(() => {
        adjustTextareaHeight();
    }, [note]);

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
                onChange={handleInputChange}
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
