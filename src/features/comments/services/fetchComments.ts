// src/services/comments/fetchComments.ts
import {fetchCommentsFromLocalIncrementally} from './localFetch';
import { fetchCommentsFromRemote } from './remoteFetch';

import {isLocalEnvironment} from "../../shared/utils/environmentVariables";

export const fetchComments = async (
    onCommentsFetched: (comments: any[]) => void,
    bypassCache = false,
    continuationToken?: string,
    signal?: AbortSignal
) => {
    if (isLocalEnvironment()) {
        await fetchCommentsFromLocalIncrementally(onCommentsFetched, signal);
    } else {
        return fetchCommentsFromRemote(onCommentsFetched, signal, bypassCache, continuationToken);
    }
};


export const fetchChatReplies = async (pageToken = '') => {
    // This is a dummy function that returns an empty list of chat replies
    return {
        items: []
    };
};