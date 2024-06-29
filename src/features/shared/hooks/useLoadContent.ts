import { useDispatch } from 'react-redux';

import { fetchComments, fetchChatReplies } from '../../comments/services/fetchComments';
import {
    setComments, setFilteredTranscripts,
    setOriginalComments,
    setLoading,
    setReplies,
    setTranscripts,
    updateCommentsData
} from "../../../store/store";
import {fetchTranscript} from "../../transcripts/services/fetchTranscript";

const useLoadContent = (bypassCache = false) => {
    const dispatch = useDispatch();

    const loadComments = async (bypassCache = false) => {
        dispatch(setLoading(true));
        const handleFetchedComments = (comments: any[]) => {
            dispatch(updateCommentsData({ comments, isLoading: false }));
            dispatch(setOriginalComments(comments));
        };
        await fetchComments(handleFetchedComments, bypassCache);
    };

    const loadChatReplies = async () => {
        dispatch(setLoading(true));
        const data = await fetchChatReplies();
        if (data && data.items) {
            dispatch(setReplies(data.items));
        } else {
            dispatch(setReplies([]));
        }
        dispatch(setLoading(false));
    };

    const loadTranscript = async () => {
        dispatch(setLoading(true));
        const data = await fetchTranscript();
        if (data && data.items) {
            dispatch(setTranscripts(data.items));
            dispatch(setFilteredTranscripts(data.items));
        } else {
            dispatch(setTranscripts([]));
        }
        dispatch(setLoading(false));
    };

    const loadAll = async (bypassCache = false) => {
        dispatch(setLoading(true));
        const handleFetchedComments = (comments: any[]) => {
            const allItems = [
                ...comments,
                ...(chatRepliesData && chatRepliesData.items ? chatRepliesData.items : []),
                ...(transcriptsData && transcriptsData.items ? transcriptsData.items : [])
            ];
            dispatch(setComments(allItems));
            dispatch(setLoading(false));
        };

        const commentsData = await fetchComments(handleFetchedComments, bypassCache, undefined);
        const chatRepliesData = await fetchChatReplies();
        const transcriptsData = await fetchTranscript();
    };

    return {
        loadComments,
        loadChatReplies,
        loadTranscript,
        loadAll
    };
};

export default useLoadContent;