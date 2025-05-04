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
import {CACHE_KEYS, PAGINATION} from "../../../shared/utils/appConstants.ts";
import {db} from "../../../shared/utils/database/database";
import {loadPagedComments} from "../pagination";

let currentAbortController = new AbortController();
window.addEventListener('message', (event: MessageEvent) => {
    if (event.data.type === 'URL_CHANGED') {
        currentAbortController.abort();
    }
});

// Fix for remoteFetch.ts
export const fetchCommentsFromRemote = async (dispatch: any, bypassCache: boolean = false) => {
    const handleInitialCommentsLoaded = async (videoId: string) => {
        console.log('Initial comments fetch completed, loading first page to Redux');

        // Use our pagination function instead of direct DB query
        const initialComments = await loadPagedComments(
            videoId,
            PAGINATION.INITIAL_PAGE,  // first page
            PAGINATION.DEFAULT_PAGE_SIZE, // page size
            'date', // default sort
            'desc'  // default order
        );

        console.log(`Loading ${initialComments.length} comments to Redux (out of many in IndexedDB)`);
        dispatch(setComments(initialComments));
        dispatch(setOriginalComments(initialComments));
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
                const initialCachedComments = cachedData.slice(0, 20);
                dispatch(setComments(initialCachedComments));
                dispatch(setOriginalComments(initialCachedComments));
                dispatch(setIsLoading(false));
                return;
            }
        }

        let token: string | null = localToken || await fetchContinuationTokenFromRemote();

        const windowObj = window as any;
        let hasQueuedRepliesValue = false;

        if (!localToken) {
            await deleteExistingComments(videoId);
        }

        do {
            const result: FetchAndProcessResult =
                await fetchAndProcessComments(token, videoId, windowObj, signal, dispatch);

            token = result.token;

            if (result.hasQueuedReplies) {
                hasQueuedRepliesValue = true;
            }

            if (token) {
                storeContinuationToken(token, CONTINUATION_TOKEN_KEY);
            }
        } while (token);

        // After all comments are fetched, load only the initial set to Redux
        await handleInitialCommentsLoaded(videoId);

        // Wait for reply processing if needed
        if (hasQueuedRepliesValue) {
            await waitForReplyProcessing();
            // Reload initial comments after replies are processed
            await handleInitialCommentsLoaded(videoId);
        }

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

// Simplified waitForReplyProcessing function
async function waitForReplyProcessing(): Promise<void> {
    while (hasActiveReplyProcessing()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}