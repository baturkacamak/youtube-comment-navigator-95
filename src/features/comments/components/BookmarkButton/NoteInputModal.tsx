import React, { useRef, useEffect, useState } from 'react';
import { PencilIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import Draggable from 'react-draggable';
import { useTranslation } from 'react-i18next';
import debounce from 'lodash/debounce';
import { Comment } from "../../../../types/commentTypes";
import {initial} from "lodash";

interface NoteInputModalProps {
    note: string;
    setNote: (note: string) => void;
    isSaving: boolean;
    setIsNoteInputVisible: (visible: boolean) => void;
    saveNote: (note: string) => void;
    comment: Comment;
    isNoteInputVisible: boolean; // Add this prop
}

const NoteInputModal: React.FC<NoteInputModalProps> = ({
                                                           note,
                                                           setNote,
                                                           isSaving,
                                                           setIsNoteInputVisible,
                                                           saveNote,
                                                           comment,
                                                           isNoteInputVisible, // Add this prop
                                                       }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const savingRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();
    const [isHovered, setIsHovered] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);
    const initialLoadRef = useRef(true);
    const initialTextareaHeight = 'h-11';
    const [textareaHeight, setTextareaHeight] = useState(initialTextareaHeight);
    const [savingHeight, setSavingHeight] = useState(0);
    const initialCountDown = 5;
    const [countdown, setCountdown] = useState(initialCountDown);
    const noteRef = useRef(note);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
        startHideTimeout();
        // Add keydown event listener
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                saveNote(noteRef.current); // Save the note before closing
                setIsNoteInputVisible(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        if (savingRef.current) {
            setSavingHeight(savingRef.current.scrollHeight);
        }
    }, [isSaving]);

    useEffect(() => {
        if (initialLoadRef.current && note.trim() === '') {
            startCountdown();
        }
    }, []);

    const startHideTimeout = () => {
        clearTimeout(timeoutRef.current!);
        timeoutRef.current = setTimeout(() => {
            if (!isHovered && !textareaRef.current?.matches(':focus') && initialLoadRef.current && note.trim() === '') {
                setIsNoteInputVisible(false);
            }
        }, 3000);
    };

    const startCountdown = () => {
        clearTimeout(countdownRef.current!);
        setCountdown(initialCountDown);
        countdownRef.current = setInterval(() => {
            setCountdown((prevCountdown) => {
                if (prevCountdown <= 1) {
                    clearInterval(countdownRef.current!);
                    setIsNoteInputVisible(false);
                }
                return prevCountdown - 1;
            });
        }, 1000);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newNote = e.target.value;
        setNote(newNote);
        noteRef.current = newNote;
        debouncedSaveNote();
        initialLoadRef.current = false;
        setTextareaHeight('h-32');
        clearInterval(countdownRef.current!);

        if (newNote.length === 0) {
            setTextareaHeight(initialTextareaHeight);
        }
    };

    const debouncedSaveNote = useRef(
        debounce(() => {
            saveNote(noteRef.current);
        }, 1000)
    ).current;

    return (
        <Draggable handle=".handle">
            <div
                className={`fixed mt-2 p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-10 cursor-move transition-all duration-500 ease-in-out ${isNoteInputVisible ? 'opacity-100 max-h-96' : 'opacity-0 max-h-0'}`}
                style={{ overflow: 'hidden' }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => {
                    setIsHovered(false);
                    startHideTimeout();
                }}
            >
                <div className="flex justify-between items-center mb-2 handle">
                    <span className="text-sm font-semibold dark:text-gray-300 flex items-center">
                        <PencilIcon className="w-4 h-4 mr-1" />
                        {t('Add a note')} - <span className="text-gray-500 pl-px text-xs">{comment.content.slice(0, 20)}...</span>
                    </span>
                    <button
                        onClick={() => {
                            saveNote(noteRef.current);
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
                    placeholder={t("Type your note here... (optional)")}
                    className={`w-80 ${textareaHeight} p-2 border rounded resize-none overflow-hidden overflow-y-auto transition-all duration-300 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 custom-scrollbar`}
                    rows={4}
                />
                <div
                    ref={savingRef}
                    className={`flex items-center transition-all duration-500 ease-in-out ${
                        isSaving ? 'opacity-100 max-h-10 py-4' : 'opacity-0 max-h-0'
                    }`}
                    style={{ maxHeight: isSaving ? savingHeight : 0 }}
                >
                    <CheckCircleIcon className="w-4 h-4 mr-1" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('Saved')}</p>
                </div>
                {initialLoadRef.current && note.trim() === '' && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 flex items-center">
                        <ClockIcon className="w-4 h-4 mr-1" />
                        {t('This modal will close in')} {countdown} {t('seconds')}
                    </div>
                )}
            </div>
        </Draggable>
    );
};

export default NoteInputModal;
