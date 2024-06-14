// src/services/comments/fetchComments.ts
import { fetchCommentsFromLocal } from './localFetch';
import { fetchCommentsFromRemote } from './remoteFetch';

import {isLocalEnvironment} from "../../shared/utils/environmentVariables";

export const fetchComments = async (
    onCommentsFetched: (comments: any[]) => void,
    signal?: AbortSignal,
    bypassCache = false
) => {
    if (isLocalEnvironment()) {
        return fetchCommentsFromLocal();
    } else {
        return fetchCommentsFromRemote(onCommentsFetched, signal, bypassCache);
    }
};


export const fetchChatReplies = async (pageToken = '') => {
    // This is a dummy function that returns an empty list of chat replies
    return {
        items: []
    };
};

export const fetchTranscript = async (pageToken = '') => {
    // This is a dummy function that returns an empty list of transcript
    return {
        items: []
    };
};
