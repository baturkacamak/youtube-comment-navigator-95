// src/services/comments/fetchComments.ts
import {fetchCommentsFromRemote} from './remote/remoteFetch';
import {fetchContinuationTokenFromRemote} from "./remote/fetchContinuationTokenFromRemote";

export const fetchComments = async (
    onCommentsFetched: (comments: any[]) => void,
    bypassCache = false,
) => {
    let continuation = await fetchContinuationTokenFromRemote();
    return fetchCommentsFromRemote(onCommentsFetched, bypassCache, continuation);
};


export const fetchChatReplies = async (pageToken = '') => {
    // This is a dummy function that returns an empty list of chat replies
    return {
        items: []
    };
};