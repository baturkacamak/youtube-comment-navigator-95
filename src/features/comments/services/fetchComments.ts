// src/services/comments/fetchComments.ts
import { fetchCommentsFromLocal } from './localFetch';
import { fetchCommentsFromRemote } from './remoteFetch';

import {isLocalEnvironment} from "../../shared/utils/environmentVariables";
import {fetchContinuationTokenFromRemote} from "./fetchContinuationData";

export const fetchComments = async (
    onCommentsFetched: (comments: any[]) => void,
    bypassCache = false,
    signal?: AbortSignal
) => {
    if (isLocalEnvironment()) {
        return fetchCommentsFromLocal();
    } else {
        let continuation = await fetchContinuationTokenFromRemote();
        return fetchCommentsFromRemote(onCommentsFetched, signal, bypassCache, continuation);
    }
};


export const fetchChatReplies = async (pageToken = '') => {
    // This is a dummy function that returns an empty list of chat replies
    return {
        items: []
    };
};