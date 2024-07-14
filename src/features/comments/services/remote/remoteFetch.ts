import { fetchCommentJsonDataFromRemote } from "./fetchCommentJsonDataFromRemote";
import { extractYouTubeVideoIdFromUrl } from "../../../shared/utils/extractYouTubeVideoIdFromUrl";
import {CACHE_KEYS, isLocalEnvironment} from "../../../shared/utils/environmentVariables";
import { processRawJsonCommentsData } from "../../utils/comments/retrieveYouTubeCommentPaths";
import { db } from "../../../shared/utils/database/database";
import { extractContinuationToken } from "./continuationTokenUtils";
import { fetchRepliesJsonDataFromRemote } from "./fetchReplies";

let currentAbortController = new AbortController();
window.addEventListener('message', (event: MessageEvent) => {
    if (event.data.type === 'URL_CHANGED') {
        currentAbortController.abort();
    }
});
export const fetchCommentsFromRemote = async (
    onCommentsFetched: (comments: any[]) => void,
    bypassCache: boolean = false,
    continuationToken?: string
) => {
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
        const TEMP_CACHE_KEY = CACHE_KEYS.TEMP(videoId);
        const CONTINUATION_TOKEN_KEY = CACHE_KEYS.CONTINUATION_TOKEN(videoId);


        // Retrieve cached data
        const cachedData = await db.comments.where('videoId').equals(videoId).toArray();
        if (!bypassCache && cachedData.length > 0) {
            onCommentsFetched(cachedData);
            return;
        }

        const windowObj = window as any; // Cast window to any to use in YouTube logic
        let token: string | null = continuationToken || null;
        let totalFetchedComments = 0;
        let updateInterval: ReturnType<typeof setInterval> | null = null;

        const updateUI = async () => {
            const commentsFromDB = await db.comments.where('videoId').equals(videoId).toArray();
            onCommentsFetched(commentsFromDB);
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
            const processedData = processRawJsonCommentsData(allComments); // Pass videoId to the processing function

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
        } while (token);

        // Clear interval after all comments are fetched
        if (updateInterval) {
            clearInterval(updateInterval);
        }

        // Final update from the database
        await updateUI();

        // Clear temporary cache and continuation token after all comments are fetched
        localStorage.removeItem(CONTINUATION_TOKEN_KEY);
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.log('Fetch operation was aborted.');
        } else {
            console.error('Error fetching comments from remote:', error);
        }
    }
};
