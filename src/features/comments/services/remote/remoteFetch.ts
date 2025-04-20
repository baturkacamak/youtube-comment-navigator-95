// src/features/comments/services/remote/remoteFetch.ts
import { fetchContinuationTokenFromRemote } from "./fetchContinuationTokenFromRemote";
import { fetchAndProcessComments, FetchAndProcessResult, hasActiveReplyProcessing } from "./fetchAndProcessComments";
import {
    setDisplayedComments,
    setIsLoading,
    setTotalCommentCount,
    clearDisplayedComments
} from "../../../../store/store";
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
        dispatch(setDisplayedComments(comments.slice(0, 10)));
        dispatch(setTotalCommentCount(comments.length));
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
                return cachedData;
            }
        }

        dispatch(clearDisplayedComments());

        let token: string | null = localToken || await fetchContinuationTokenFromRemote();

        const windowObj = window as any;
        let updateInterval: ReturnType<typeof setInterval> | null = null;

        const updateUI = async () => {
            const commentsFromDB = await fetchCachedComments(videoId);
            handleFetchedComments(commentsFromDB);
            return commentsFromDB;
        };

        if (!localToken) {
            await deleteExistingComments(videoId);
        }

        updateInterval = setInterval(updateUI, 2000);

        let hasQueuedReplies = false;

        do {
            // @ts-ignore
            let { token: newToken, hasQueuedReplies: hasNewQueuedReplies }: FetchAndProcessResult =
                await fetchAndProcessComments(token, videoId, windowObj, signal, dispatch);
            token = newToken;

            if (hasNewQueuedReplies) {
                hasQueuedReplies = true;
            }

            await updateUI();

            if (token) {
                storeContinuationToken(token, CONTINUATION_TOKEN_KEY);
            }
        } while (token);

        if (hasQueuedReplies) {
            await waitForReplyProcessing(updateInterval, updateUI);
        } else if (updateInterval) {
            clearInterval(updateInterval);
        }

        const finalComments = await updateUI();
        clearLocalContinuationToken(CONTINUATION_TOKEN_KEY);
        return finalComments;
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.log('Fetch operation was aborted.');
        } else {
            console.error('Error fetching comments from remote:', error);
        }
        return [];
    }
};

async function waitForReplyProcessing(
    updateInterval: ReturnType<typeof setInterval> | null,
    updateUIFn: () => Promise<any[]>
): Promise<void> {
    if (!updateInterval) return;

    while (hasActiveReplyProcessing()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    clearInterval(updateInterval);

    await updateUIFn();
}