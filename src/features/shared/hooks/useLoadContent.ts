import { useDispatch } from 'react-redux';
import { fetchChatReplies } from '../../comments/services/fetchComments';
import {
    setComments, setFilteredTranscripts,
    setOriginalComments,
    setIsLoading,
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

    return {
        loadComments,
        loadTranscript,
    };
};

export default useLoadContent;