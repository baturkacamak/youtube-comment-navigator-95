import { useDispatch } from 'react-redux';

import { fetchComments, fetchChatReplies, fetchTranscript } from '../services/fetchComments';
import {
    setComments, setCommentsCount,
    setInitialComments,
    setLoading,
    setReplies,
    setRepliesCount,
    setTranscripts, setTranscriptsCount,
    updateCommentsData
} from "../../../store/store";

const useLoadComments = (bypassCache = false) => {
    const dispatch = useDispatch();

    const loadComments = async (bypassCache = false) => {
        dispatch(setLoading(true));
        const handleFetchedComments = (comments: any[]) => {
            dispatch(updateCommentsData({ comments, isLoading: false }));
            dispatch(setInitialComments(comments));
        };
        await fetchComments(handleFetchedComments, bypassCache);
    };

    const loadChatReplies = async () => {
        dispatch(setLoading(true));
        const data = await fetchChatReplies();
        if (data && data.items) {
            dispatch(setReplies(data.items));
            dispatch(setRepliesCount(data.items.length));
        } else {
            dispatch(setReplies([]));
            dispatch(setRepliesCount(0));
        }
        dispatch(setLoading(false));
    };

    const loadTranscript = async () => {
        dispatch(setLoading(true));
        const data = await fetchTranscript();
        if (data && data.items) {
            dispatch(setTranscripts(data.items));
            dispatch(setTranscriptsCount(data.items.length));
        } else {
            dispatch(setTranscripts([]));
            dispatch(setTranscriptsCount(0));
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
            dispatch(setCommentsCount(comments.length));
            dispatch(setRepliesCount(chatRepliesData && chatRepliesData.items ? chatRepliesData.items.length : 0));
            dispatch(setTranscriptsCount(transcriptsData && transcriptsData.items ? transcriptsData.items.length : 0));
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

export default useLoadComments;