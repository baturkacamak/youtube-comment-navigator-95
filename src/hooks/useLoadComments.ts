import { useDispatch } from 'react-redux';
import { setComments, setCommentsCount, setLoading, setReplies, setTranscripts, setTranscriptsCount, setRepliesCount } from '../store/store';
import { fetchComments, fetchChatReplies, fetchTranscript } from '../services/comments/fetchComments';

const useLoadComments = () => {
    const dispatch = useDispatch();

    const loadComments = async (bypassCache = false) => {
        dispatch(setLoading(true));
        const data = await fetchComments(bypassCache);
        dispatch(setComments(data.items));
        dispatch(setCommentsCount(data.items.length));
        dispatch(setLoading(false));
    };

    const loadChatReplies = async () => {
        dispatch(setLoading(true));
        const data = await fetchChatReplies();
        dispatch(setReplies(data.items));
        dispatch(setRepliesCount(data.items.length));
        dispatch(setLoading(false));
    };

    const loadTranscript = async () => {
        dispatch(setLoading(true));
        const data = await fetchTranscript();
        dispatch(setTranscripts(data.items));
        dispatch(setTranscriptsCount(data.items.length));
        dispatch(setLoading(false));
    };

    const loadAll = async (bypassCache = false) => {
        dispatch(setLoading(true));
        const commentsData = await fetchComments();
        const chatRepliesData = await fetchChatReplies();
        const transcriptsData = await fetchTranscript();
        const allItems = [...commentsData.items, ...chatRepliesData.items, ...transcriptsData.items];
        dispatch(setComments(allItems));
        dispatch(setCommentsCount(commentsData.items.length));
        dispatch(setRepliesCount(chatRepliesData.items.length));
        dispatch(setTranscriptsCount(transcriptsData.items.length));
        dispatch(setLoading(false));
    };

    return {
        loadComments,
        loadChatReplies,
        loadTranscript,
        loadAll
    };
};

export default useLoadComments;
