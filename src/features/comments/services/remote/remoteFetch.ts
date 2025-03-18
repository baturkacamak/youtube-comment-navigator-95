// src/features/comments/services/remote/remoteFetch.ts
import { fetchContinuationTokenFromRemote } from "./fetchContinuationTokenFromRemote";
import { fetchAndProcessComments, FetchAndProcessResult, hasActiveReplyProcessing } from "./fetchAndProcessComments";
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

        // Start the UI update interval immediately to catch both comments and replies
        // We'll clear it when all processing is complete
        updateInterval = setInterval(updateUI, 2000);

        let hasQueuedReplies = false;

        do {
            const result: FetchAndProcessResult = await fetchAndProcessComments(token, videoId, windowObj, signal);
            totalFetchedComments += result.processedData.items.length;
            token = result.token;

            // Track if any batch has queued replies
            if (result.hasQueuedReplies) {
                hasQueuedReplies = true;
            }

            // Update UI immediately for parent comments
            await updateUI();

            if (token) {
                storeContinuationToken(token, CONTINUATION_TOKEN_KEY);
            }
        } while (token);

        // If we have background reply processing, wait for it to complete
        // before clearing the interval and doing the final update
        if (hasQueuedReplies) {
            // Continue updating UI until all reply tasks are done
            await waitForReplyProcessing(updateInterval, updateUI);
        } else if (updateInterval) {
            // No replies to process, clear the interval
            clearInterval(updateInterval);
        }

        // Final UI update
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

/**
 * Helper function to wait for background reply processing to complete
 * while continuing to update the UI periodically
 */
async function waitForReplyProcessing(
    updateInterval: ReturnType<typeof setInterval> | null,
    updateUIFn: () => Promise<void>
): Promise<void> {
    // If there's no interval, nothing to wait for
    if (!updateInterval) return;

    // Check every second if reply processing is still active
    while (hasActiveReplyProcessing()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Clear the interval once all processing is complete
    clearInterval(updateInterval);

    // Do one final UI update
    await updateUIFn();
}