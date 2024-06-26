import { useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import debounce from 'lodash/debounce';
import { storeDataInDB } from "../../shared/utils/cacheUtils";
import { setBookmarkedComments } from "../../../store/store";
import { RootState } from "../../../types/rootState";
import { Comment } from "../../../types/commentTypes";

const useNoteHandler = (comment: Comment, setIsNoteInputVisible: (visible: boolean) => void, handleExtraLogic?: (newNote: string) => void) => {
    const [note, setNote] = useState(comment?.note || '');
    const noteRef = useRef(comment.note);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const savingRef = useRef<HTMLDivElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const dispatch = useDispatch();
    const bookmarkedComments = useSelector((state: RootState) => state.bookmarkedComments);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                saveNote(); // Save the note before closing
                setIsNoteInputVisible(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newNote = e.target.value;
        setNote(newNote);
        noteRef.current = newNote;
        debouncedSaveNote();

        // Call the extra logic handler if provided
        if (handleExtraLogic) {
            handleExtraLogic(newNote);
        }
    };

    const debouncedSaveNote = useCallback(
        debounce(() => {
            saveNote();
        }, 1000),
        []
    );

    const saveNote = async () => {
        setIsSaving(true);
        const updatedBookmarks = bookmarkedComments.map((bookmark: Comment) =>
            bookmark.commentId === comment.commentId ? { ...bookmark, note: noteRef.current } : bookmark
        );
        await storeDataInDB('bookmarks', updatedBookmarks);
        dispatch(setBookmarkedComments(updatedBookmarks));
        setTimeout(() => {
            setIsSaving(false);
        }, 2000);
    };

    return {
        note,
        setNote,
        noteRef,
        textareaRef,
        savingRef,
        isSaving,
        handleInputChange,
        saveNote
    };
};

export default useNoteHandler;
