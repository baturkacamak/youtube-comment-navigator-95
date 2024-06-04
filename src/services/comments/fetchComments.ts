// src/services/comments/fetchComments.ts
import { fetchCommentsFromLocal } from './localFetch';
import { fetchCommentsFromRemote } from './remoteFetch';

const isLocalEnvironment = process.env.NODE_ENV === 'development'; // Or any other condition to determine the environment

export const fetchComments = async (bypassCache = false) => {
    if (isLocalEnvironment) {
        return fetchCommentsFromLocal();
    } else {
        return fetchCommentsFromRemote(bypassCache);
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
