// src/features/comments/services/remote/remoteFetch.ts
import { fetchContinuationTokenFromRemote } from "./fetchContinuationTokenFromRemote";
import { fetchAndProcessComments, FetchAndProcessResult, hasActiveReplyProcessing, resetLocalCommentCount } from "./fetchAndProcessComments";
import {setComments, setIsLoading, setTotalCommentsCount} from "../../../../store/store";
import {
    clearLocalContinuationToken,
    deleteExistingComments,
    fetchCachedComments,
    getVideoId,
    retrieveLocalContinuationToken,
    storeContinuationToken
} from "./utils";
import { CACHE_KEYS, PAGINATION } from "../../../shared/utils/appConstants";
import { db } from "../../../shared/utils/database/database";
import {countComments, loadPagedComments} from "../pagination";
import logger from "../../../shared/utils/logger";

let currentAbortController = new AbortController();
window.addEventListener('message', (event: MessageEvent) => {
    if (event.data.type === 'URL_CHANGED') {
        currentAbortController.abort();
    }
});

export const fetchCommentsFromRemote = async (dispatch: any, bypassCache: boolean = false) => {
    // abort any previous ongoing fetch for route changes
    try {
        currentAbortController.abort();
        currentAbortController = new AbortController();
        const signal = currentAbortController.signal;

        const videoId = getVideoId();
        const CONTINUATION_TOKEN_KEY = CACHE_KEYS.CONTINUATION_TOKEN(videoId);

        logger.info(`[RemoteFetch] Starting fetch for video ID: ${videoId}`);
        let localToken = retrieveLocalContinuationToken(CONTINUATION_TOKEN_KEY);

        // Reset local comment count for new video
        resetLocalCommentCount();

        if (!bypassCache && !localToken) {
            const hasLoadedFromCache = await loadCachedCommentsIfAny(videoId, dispatch);
            if (hasLoadedFromCache) {
                return;
            }
        }

        let token: string | null = localToken || (await fetchContinuationTokenFromRemote());

        const windowObj = window as any;

        // ensure we start from a clean state if there is no continuation token cached
        await deleteCommentsIfFreshFetch(localToken, videoId);

        // fetch all comments iteratively and determine if there are queued replies
        const hasQueuedRepliesValue = await iterateFetchComments(
            token,
            videoId,
            CONTINUATION_TOKEN_KEY,
            windowObj,
            signal,
            dispatch
        );

        // once all comments are fetched, load the first page to UI
        await loadInitialComments(videoId, dispatch);

        if (hasQueuedRepliesValue) {
            try {
                await waitForReplyProcessing();
                await loadInitialComments(videoId, dispatch);
            } catch (e) {
                logger.error('Error waiting for reply processing:', e);
            }
        }

        clearLocalContinuationToken(CONTINUATION_TOKEN_KEY);
    } catch (error: unknown) {
        if ((error as Error)?.name === 'AbortError') {
            logger.info('Fetch operation was aborted.');
        } else {
            logger.error('Error fetching comments from remote:', error);
        }
        dispatch(setIsLoading(false));
    }
};

async function waitForReplyProcessing(): Promise<void> {
    logger.start('waitForReplyProcessing');
    while (hasActiveReplyProcessing()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    logger.end('waitForReplyProcessing');
}

// New helper function: Load initial paged comments from IndexedDB and dispatch
async function loadInitialComments(videoId: string, dispatch: any): Promise<void> {
    try {
        logger.start('loadInitialComments');
        const initialComments = await loadPagedComments(
            db.comments,
            videoId,
            PAGINATION.INITIAL_PAGE,
            PAGINATION.DEFAULT_PAGE_SIZE,
            'date',
            'desc'
        );
        const totalCount = await countComments(db.comments, videoId);
        dispatch(setTotalCommentsCount(totalCount));
        logger.success(`Loaded ${initialComments.length} comments from IndexedDB`);
        dispatch(setComments(initialComments));
    } catch (err) {
        logger.error('Failed to load initial comments from IndexedDB:', err);
    } finally {
        dispatch(setIsLoading(false));
        logger.end('loadInitialComments');
    }
}

// New helper function: attempt to load cached comments and dispatch first page
async function loadCachedCommentsIfAny(videoId: string, dispatch: any): Promise<boolean> {
    try {
        const cachedData = await fetchCachedComments(videoId);
        if (cachedData.length > 0) {
            logger.success(`Loaded ${cachedData.length} cached comments`);
            const initialCachedComments = cachedData.slice(0, PAGINATION.DEFAULT_PAGE_SIZE);
            dispatch(setComments(initialCachedComments));
            dispatch(setIsLoading(false));
            return true;
        }
    } catch (err) {
        logger.error('Error fetching cached comments:', err);
    }
    return false;
}

// New helper function: iterate over continuation tokens until exhausted
async function iterateFetchComments(
    initialToken: string | null,
    videoId: string,
    CONTINUATION_TOKEN_KEY: string,
    windowObj: any,
    signal: AbortSignal,
    dispatch: any
): Promise<boolean> {
    let token: string | null = initialToken;
    let hasQueuedRepliesValue = false;

    do {
        try {
            const result: FetchAndProcessResult = await fetchAndProcessComments(
                token,
                videoId,
                windowObj,
                signal,
                dispatch
            );

            token = result.token;
            if (result.hasQueuedReplies) {
                hasQueuedRepliesValue = true;
            }
            if (token) {
                storeContinuationToken(token, CONTINUATION_TOKEN_KEY);
            }
        } catch (e) {
            if ((e as any)?.name === 'AbortError') {
                logger.warn('Fetch operation aborted during iteration.');
                throw e;
            }
            logger.error('Error during comment fetch iteration:', e);
            break;
        }
    } while (token);

    return hasQueuedRepliesValue;
}

// New helper function: delete existing comments when starting a fresh fetch
async function deleteCommentsIfFreshFetch(localToken: string | null, videoId: string): Promise<void> {
    if (!localToken) {
        try {
            await deleteExistingComments(videoId);
            logger.info(`Deleted existing comments for ${videoId}`);
        } catch (e) {
            logger.error('Failed to delete existing comments before fetch:', e);
        }
    }
}