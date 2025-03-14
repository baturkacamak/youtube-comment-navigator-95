import { useDispatch } from 'react-redux';
import { fetchChatReplies } from '../../comments/services/fetchComments';
import {
    setComments, setFilteredTranscripts,
    setOriginalComments,
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
            const allItems = [
                ...comments,
                ...(chatRepliesData && chatRepliesData.items ? chatRepliesData.items : []),
                ...(transcriptsData && transcriptsData.items ? transcriptsData.items : [])
            ];
            dispatch(setComments(allItems));
            dispatch(setIsLoading(false));
        };

        const commentsData = await fetchCommentsFromRemote(handleFetchedComments, bypassCache);
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