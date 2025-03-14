// src/features/comments/services/remote/remoteFetch.ts
import { fetchContinuationTokenFromRemote } from "./fetchContinuationTokenFromRemote";
import {fetchAndProcessComments, FetchAndProcessResult} from "./fetchAndProcessComments";
import { setComments, setIsLoading, setOriginalComments } from "../../../../store/store";
import {
    clearLocalContinuationToken,
    deleteExistingComments,
    fetchCachedComments,
    getVideoId,
    retrieveLocalContinuationToken,
    storeContinuationToken
} from "./utils";
import { CACHE_KEYS } from "../../../shared/utils/environmentVariables";
import {fetchCommentJsonDataFromRemote} from "./fetchCommentJsonDataFromRemote";
import {extractContinuationToken} from "./continuationTokenUtils";

let currentAbortController = new AbortController();
window.addEventListener('message', (event: MessageEvent) => {
    if (event.data.type === 'URL_CHANGED') {
        currentAbortController.abort();
    }
});

async function fetchNextTokenOnly(token: string, windowObj: any, signal: AbortSignal): Promise<{ nextToken: string | null }> {
    const response = await fetchCommentJsonDataFromRemote(token, windowObj, signal);
    const nextToken = extractContinuationToken(
        response.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems ||
        response.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || []
    );
    return { nextToken };
}

export const fetchCommentsFromRemote = async (dispatch: any, bypassCache: boolean = false) => {
    const handleFetchedComments = (comments: any[]) => {
        dispatch(setComments(comments));
        dispatch(setOriginalComments(comments));
        dispatch(setIsLoading(false));
    };

    try {
        currentAbortController.abort();
        currentAbortController = new AbortController();
        const signal = currentAbortController.signal;

        const videoId = getVideoId();
        const CONTINUATION_TOKEN_KEY = CACHE_KEYS.CONTINUATION_TOKEN(videoId);

        let localToken = retrieveLocalContinuationToken(CONTINUATION_TOKEN_KEY);

        if (!bypassCache && !localToken) {
            const cachedData = await fetchCachedComments(videoId);
            if (cachedData.length > 0) {
                handleFetchedComments(cachedData);
                return;
            }
        }

        let initialToken: string | null = localToken || await fetchContinuationTokenFromRemote();

        const windowObj = window as any;

        if (!localToken) {
            await deleteExistingComments(videoId);
        }

        // First, collect a batch of tokens for parallel fetching
        const tokensToFetch: string[] = [];
        let currentToken: string | null = initialToken;
        const MAX_PARALLEL_REQUESTS = 5; // Adjust based on browser capabilities

        // Pre-fetch initial token batch
        for (let i = 0; i < MAX_PARALLEL_REQUESTS && currentToken; i++) {
            tokensToFetch.push(currentToken);

            // Just get the next token without processing comments yet
            const result: { nextToken: string | null } = await fetchNextTokenOnly(currentToken, windowObj, signal);
            currentToken = result.nextToken;

            if (!currentToken) break;
        }

        console.log(`Starting parallel fetch of ${tokensToFetch.length} comment batches`);

        // Setup a quick UI update interval
        const updateInterval = setInterval(async () => {
            const commentsFromDB = await fetchCachedComments(videoId);
            handleFetchedComments(commentsFromDB);
        }, 1000);

        // Process tokens in parallel batches
        while (tokensToFetch.length > 0 && !signal.aborted) {
            // Take up to MAX_PARALLEL_REQUESTS tokens to process
            const currentBatch = tokensToFetch.splice(0, MAX_PARALLEL_REQUESTS);

            // Process this batch in parallel
            const fetchPromises = currentBatch.map(token =>
                fetchAndProcessComments(token, videoId, windowObj, signal)
            );

            try {
                const results = await Promise.all(fetchPromises);

                // Get more tokens for the next batch while we're processing this one
                for (const result of results) {
                    if (result.token) {
                        tokensToFetch.push(result.token);
                        storeContinuationToken(result.token, CONTINUATION_TOKEN_KEY);
                    }
                }
            } catch (error) {
                console.error("Error in parallel comment batch processing:", error);
                break;
            }
        }

        clearInterval(updateInterval);

        // Final UI update
        const commentsFromDB = await fetchCachedComments(videoId);
        handleFetchedComments(commentsFromDB);
        clearLocalContinuationToken(CONTINUATION_TOKEN_KEY);

    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.log('Fetch operation was aborted.');
        } else {
            console.error('Error fetching comments from remote:', error);
        }
        dispatch(setIsLoading(false));
    }
};