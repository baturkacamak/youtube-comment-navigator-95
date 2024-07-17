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

let currentAbortController = new AbortController();
window.addEventListener('message', (event: MessageEvent) => {
    if (event.data.type === 'URL_CHANGED') {
        currentAbortController.abort();
    }
});

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

        let token: string | null = localToken || await fetchContinuationTokenFromRemote();

        const windowObj = window as any;
        let totalFetchedComments = 0;
        let updateInterval: ReturnType<typeof setInterval> | null = null;

        const updateUI = async () => {
            const commentsFromDB = await fetchCachedComments(videoId);
            handleFetchedComments(commentsFromDB);
        };

        if (!localToken) {
            await deleteExistingComments(videoId);
        }

        do {
            const { processedData, token: newToken }: FetchAndProcessResult = await fetchAndProcessComments(token, videoId, windowObj, signal);
            totalFetchedComments += processedData.items.length;
            token = newToken;

            if (totalFetchedComments >= 500 && !updateInterval) {
                updateInterval = setInterval(updateUI, 2000);
            } else if (totalFetchedComments < 500) {
                await updateUI();
            }

            if (token) {
                storeContinuationToken(token, CONTINUATION_TOKEN_KEY);
            }
        } while (token);

        if (updateInterval) {
            clearInterval(updateInterval);
        }

        await updateUI();
        clearLocalContinuationToken(CONTINUATION_TOKEN_KEY);
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.log('Fetch operation was aborted.');
        } else {
            console.error('Error fetching comments from remote:', error);
        }
    }
};
