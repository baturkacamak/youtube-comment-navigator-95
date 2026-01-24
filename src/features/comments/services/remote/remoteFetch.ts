import { fetchContinuationTokenFromRemote } from "./fetchContinuationTokenFromRemote";
import { fetchAndProcessComments, FetchAndProcessResult, hasActiveReplyProcessing, resetLocalCommentCount } from "./fetchAndProcessComments";
import { fetchAndProcessLiveChat } from "../liveChat/fetchLiveChat";
import {setComments, setIsLoading, setTotalCommentsCount} from "../../../../store/store";
import {
    clearContinuationToken,
    deleteCommentsFromDb,
    getCachedComments,
    extractVideoId,
    getContinuationToken,
    storeContinuationToken
} from "./utils";
import { CACHE_KEYS, PAGINATION } from "../../../shared/utils/appConstants";
import { db } from "../../../shared/utils/database/database";
import {countComments, loadPagedComments} from "../pagination";
import logger from "../../../shared/utils/logger";

let currentAbortController = new AbortController();

// Handle URL changes
window.addEventListener('message', (event: MessageEvent) => {
    if (event.data.type === 'URL_CHANGED') {
        abortAllOngoingOperations();
    }
});

// Function to abort all ongoing operations
function abortAllOngoingOperations() {
    try {
        currentAbortController.abort();
        currentAbortController = new AbortController();
        logger.info('All ongoing operations aborted.');
    } catch (error) {
        logger.error('Failed to abort ongoing operations:', error);
    }
}

export const fetchCommentsFromRemote = async (dispatch: any, bypassCache: boolean = false) => {
    // abort any previous ongoing fetch operations
    try {
        abortAllOngoingOperations();
        const signal = currentAbortController.signal;

        const videoId = extractVideoId();
        const CONTINUATION_TOKEN_KEY = CACHE_KEYS.CONTINUATION_TOKEN(videoId);

        logger.info(`[RemoteFetch] Starting fetch for video ID: ${videoId}`);
        
        // Reset local comment count for new video or when bypassing cache
        resetLocalCommentCount();
        
        // Clear continuation token if we're explicitly bypassing cache (e.g., "load more comments")
        if (bypassCache) {
            await clearContinuationToken(videoId);
            // Delete all existing comments for this video to start fresh
            await deleteCommentsFromDb(videoId);
            logger.info(`Bypassing cache and starting fresh download for ${videoId}`);
        }

        // Get the local token only if we're not bypassing cache
        let localToken = bypassCache ? null : await getContinuationToken(videoId);

        if (!bypassCache && !localToken) {
            const hasLoadedFromCache = await loadCachedCommentsIfAny(videoId, dispatch);
            if (hasLoadedFromCache) {
                return;
            }
        }

        let token: string | null = localToken || (await fetchContinuationTokenFromRemote());

        const windowObj = window as any;

        // Ensure we start from a clean state if there is no continuation token cached
        // or if we're bypassing cache
        if (!localToken || bypassCache) {
            await deleteCommentsIfFreshFetch(null, videoId);
        }

        // Start live chat fetch concurrently
        const liveChatPromise = fetchAndProcessLiveChat(videoId, windowObj, signal, dispatch);

        // fetch all comments iteratively and determine if there are queued replies
        const hasQueuedRepliesValue = await iterateFetchComments(
            token,
            videoId,
            CONTINUATION_TOKEN_KEY,
            windowObj,
            signal,
            dispatch
        );

        // Ensure live chat fetch is also complete
        await liveChatPromise;

        // Handle signal abort at the top level
        if (signal.aborted) {
            logger.info('Fetch operation was aborted before completion.');
            dispatch(setIsLoading(false));
            return;
        }

        // once all comments are fetched, load the first page to UI
        await loadInitialComments(videoId, dispatch);

        if (hasQueuedRepliesValue) {
            try {
                await waitForReplyProcessing();
                // Check if aborted again after waiting for replies
                if (signal.aborted) {
                    logger.info('Operation aborted after waiting for reply processing.');
                    dispatch(setIsLoading(false));
                    return;
                }
                await loadInitialComments(videoId, dispatch);
            } catch (e) {
                if ((e as Error)?.name === 'AbortError') {
                    logger.info('Reply wait operation was aborted.');
                } else {
                    logger.error('Error waiting for reply processing:', e);
                }
            }
        }

        await clearContinuationToken(videoId);
    } catch (error: unknown) {
        if ((error as Error)?.name === 'AbortError') {
            logger.info('Fetch operation was aborted.');
        } else {
            const err = error as Error;
            logger.error('Error fetching comments from remote:', {
                name: err?.name,
                message: err?.message,
                stack: err?.stack,
                raw: error
            });
        }
        dispatch(setIsLoading(false));
    }
};

async function waitForReplyProcessing(): Promise<void> {
    logger.start('waitForReplyProcessing');
    const maxWaitTime = 30000; // 30 seconds maximum wait
    const startTime = Date.now();
    
    while (hasActiveReplyProcessing()) {
        // Check for timeout
        if (Date.now() - startTime > maxWaitTime) {
            logger.warn('Exceeded maximum wait time for reply processing.');
            break;
        }
        
        // Check for abort signal
        if (currentAbortController.signal.aborted) {
            logger.info('Reply wait operation aborted.');
            throw new DOMException('Reply wait aborted', 'AbortError');
        }
        
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
            'desc',
            {},
            '',
            { excludeLiveChat: true }
        );
        const totalCount = await countComments(db.comments, videoId, {}, '', { excludeLiveChat: true });
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
        const cachedData = await getCachedComments(videoId);
        if (cachedData && cachedData.length > 0) {
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
            // Check if operation has been aborted
            if (signal.aborted) {
                logger.info('Fetch comments iteration aborted.');
                throw new DOMException('Fetch aborted', 'AbortError');
            }
            
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
                await storeContinuationToken(videoId, token);
            }
        } catch (e) {
            if ((e as any)?.name === 'AbortError') {
                logger.info('Fetch operation aborted during iteration.');
                throw e;
            }
            const err = e as Error;
            logger.error('Error during comment fetch iteration:', {
                name: err?.name,
                message: err?.message,
                stack: err?.stack,
                raw: e
            });
            break;
        }
    } while (token);

    return hasQueuedRepliesValue;
}

// New helper function: delete existing comments when starting a fresh fetch
async function deleteCommentsIfFreshFetch(localToken: string | null, videoId: string): Promise<void> {
    if (!localToken) {
        try {
            await deleteCommentsFromDb(videoId);
            logger.info(`Deleted existing comments for ${videoId}`);
        } catch (e) {
            logger.error('Failed to delete existing comments before fetch:', e);
        }
    }
}