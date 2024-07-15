// src/features/comments/services/remote/remoteFetch.ts

import { fetchCommentJsonDataFromRemote } from "./fetchCommentJsonDataFromRemote";
import { extractYouTubeVideoIdFromUrl } from "../../../shared/utils/extractYouTubeVideoIdFromUrl";
import { CACHE_KEYS, isLocalEnvironment } from "../../../shared/utils/environmentVariables";
import { processRawJsonCommentsData } from "../../utils/comments/retrieveYouTubeCommentPaths";
import { db } from "../../../shared/utils/database/database";
import { extractContinuationToken } from "./continuationTokenUtils";
import { fetchRepliesJsonDataFromRemote } from "./fetchReplies";
import { fetchContinuationTokenFromRemote } from "./fetchContinuationTokenFromRemote";
import {setComments, setIsLoading, setOriginalComments} from "../../../../store/store";

let currentAbortController = new AbortController();
window.addEventListener('message', (event: MessageEvent) => {
    if (event.data.type === 'URL_CHANGED') {
        currentAbortController.abort();
    }
});

const storeContinuationToken = (videoId: string, token: string, continuationTokenKey: string) => {
    const tokens = JSON.parse(localStorage.getItem(continuationTokenKey) || '{}');
    tokens[videoId] = token;
    localStorage.setItem(continuationTokenKey, JSON.stringify(tokens));
};

const retrieveCachedContinuationToken = (videoId: string, continuationTokenKey: string): string | null => {
    const tokens = JSON.parse(localStorage.getItem(continuationTokenKey) || '{}');
    return tokens[videoId] || null;
};

export const fetchCommentsFromRemote = async (
    dispatch: any,
    bypassCache: boolean = false,
) => {
    const handleFetchedComments = (comments: any[]) => {
        dispatch(setComments(comments));
        dispatch(setOriginalComments(comments));
        dispatch(setIsLoading(false));
    };

    try {
        // Abort previous requests
        currentAbortController.abort();

        // Create a new AbortController for the new video
        currentAbortController = new AbortController();
        const signal = currentAbortController.signal;

        let videoId = extractYouTubeVideoIdFromUrl();
        if (isLocalEnvironment()) {
            videoId = 'localVideoId';
        }
        if (!videoId) {
            throw new Error('Video ID not found');
        }

        const LOCAL_STORAGE_KEY = CACHE_KEYS.FINAL(videoId);
        const CONTINUATION_TOKEN_KEY = CACHE_KEYS.CONTINUATION_TOKEN(videoId);

        // Retrieve the continuation token from local storage if it exists
        let token: string | null = retrieveCachedContinuationToken(videoId, CONTINUATION_TOKEN_KEY) || await fetchContinuationTokenFromRemote() || null;

        // Retrieve cached data if cache is not bypassed and there is no continuation token
        if (!bypassCache && !token) {
            const cachedData = await db.comments.where('videoId').equals(videoId).toArray();
            if (cachedData.length > 0) {
                handleFetchedComments(cachedData);
                return;
            }
        }

        const windowObj = window as any; // Cast window to any to use in YouTube logic
        let totalFetchedComments = 0;
        let updateInterval: ReturnType<typeof setInterval> | null = null;

        const updateUI = async () => {
            const commentsFromDB = await db.comments.where('videoId').equals(videoId).toArray();
            handleFetchedComments(commentsFromDB);
        };

        // Delete existing comments with the same videoId to prevent duplication
        await db.comments.where('videoId').equals(videoId).delete();

        do {
            const rawJsonData = await fetchCommentJsonDataFromRemote(token, windowObj, signal);

            const [comments, replies] = await Promise.all([
                fetchCommentJsonDataFromRemote(token, windowObj, signal),
                fetchRepliesJsonDataFromRemote(rawJsonData, windowObj, signal)
            ]);

            const allComments = [comments, ...replies];
            const processedData = processRawJsonCommentsData(allComments, videoId); // Pass videoId to the processing function

            // Store the newly fetched comments in the database
            await db.comments.bulkPut(processedData.items);

            totalFetchedComments += processedData.items.length;

            if (totalFetchedComments >= 500 && !updateInterval) {
                updateInterval = setInterval(updateUI, 2000);
            } else if (totalFetchedComments < 500) {
                await updateUI();
            }

            const continuationItems = rawJsonData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems
                || rawJsonData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || [];
            token = extractContinuationToken(continuationItems);

            // Store the current continuation token
            if (token) {
                storeContinuationToken(videoId, token, CONTINUATION_TOKEN_KEY);
            }
        } while (token);

        // Clear interval after all comments are fetched
        if (updateInterval) {
            clearInterval(updateInterval);
        }

        // Final update from the database
        await updateUI();

        // Clear temporary cache and continuation token after all comments are fetched
        const tokens = JSON.parse(localStorage.getItem(CONTINUATION_TOKEN_KEY) || '{}');
        delete tokens[videoId];
        localStorage.setItem(CONTINUATION_TOKEN_KEY, JSON.stringify(tokens));
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.log('Fetch operation was aborted.');
        } else {
            console.error('Error fetching comments from remote:', error);
        }
    }
};
