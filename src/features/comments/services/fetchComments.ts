// src/services/comments/fetchComments.ts
import { fetchCommentsFromLocal } from './local/localFetch';
import { fetchCommentsFromRemote } from './remote/remoteFetch';

import {isLocalEnvironment} from "../../shared/utils/environmentVariables";
import {fetchContinuationTokenFromRemote} from "./remote/fetchContinuationTokenFromRemote";

export const fetchComments = async (
    onCommentsFetched: (comments: any[]) => void,
    bypassCache = false,
) => {
    if (isLocalEnvironment()) {
        return fetchCommentsFromLocal();
    } else {
        let continuation = await fetchContinuationTokenFromRemote();
        return fetchCommentsFromRemote(onCommentsFetched, bypassCache, continuation);
    }
};


export const fetchChatReplies = async (pageToken = '') => {
    // This is a dummy function that returns an empty list of chat replies
    return {
        items: []
    };
};