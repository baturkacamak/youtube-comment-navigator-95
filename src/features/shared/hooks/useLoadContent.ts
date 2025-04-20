import { useDispatch } from 'react-redux';
import { fetchChatReplies } from '../../comments/services/fetchComments';
import {
    setDisplayedComments, setFilteredTranscripts,
    setTotalCommentCount,
    setIsLoading,
    setReplies,
    setTranscripts,
} from "../../../store/store";
import {fetchTranscript} from "../../transcripts/services/fetchTranscript";
import {fetchCommentsFromRemote} from "../../comments/services/remote/remoteFetch";

const useLoadContent = (bypassCache = false) => {
    const dispatch = useDispatch();

    const loadComments = async (bypassCache = false) => {
        dispatch(setIsLoading(true));
        await fetchCommentsFromRemote(dispatch, bypassCache);
    };

    const loadChatReplies = async () => {
        dispatch(setIsLoading(true));
        const data = await fetchChatReplies();
        if (data && data.items) {
            dispatch(setReplies(data.items));
        } else {
            dispatch(setReplies([]));
        }
        dispatch(setIsLoading(false));
    };

    const loadTranscript = async () => {
        dispatch(setIsLoading(true));
        const data = await fetchTranscript();
        if (data && data.items) {
            dispatch(setTranscripts(data.items));
            dispatch(setFilteredTranscripts(data.items));
        } else {
            dispatch(setTranscripts([]));
        }
        dispatch(setIsLoading(false));
    };

    const loadAll = async (bypassCache = false) => {
        dispatch(setIsLoading(true));
        const handleFetchedComments = (comments: any[]) => {
            dispatch(setDisplayedComments(comments.slice(0, 10)));
            dispatch(setTotalCommentCount(comments.length));
        };

        // Paralel olarak veri çekelim
        const commentsPromise = fetchCommentsFromRemote(handleFetchedComments, bypassCache);
        const chatRepliesPromise = fetchChatReplies();
        const transcriptsPromise = fetchTranscript();

        // Tüm promise'ları çözelim
        const [commentsData, chatRepliesData, transcriptsData] = await Promise.all([
            commentsPromise,
            chatRepliesPromise,
            transcriptsPromise
        ]);

        // Cevapları işleyelim
        if (chatRepliesData && chatRepliesData.items) {
            dispatch(setReplies(chatRepliesData.items));
        }

        if (transcriptsData && transcriptsData.items) {
            dispatch(setTranscripts(transcriptsData.items));
            dispatch(setFilteredTranscripts(transcriptsData.items));
        }

        dispatch(setIsLoading(false));
    };

    return {
        loadComments,
        loadChatReplies,
        loadTranscript,
        loadAll
    };
};

export default useLoadContent;