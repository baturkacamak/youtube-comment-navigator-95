import { youtubeApi } from "../../../shared/services/youtubeApi";
import { db } from "../../../shared/utils/database/database";
import { setTotalCommentsCount } from "../../../../store/store";
import { processLiveChatActions } from "./liveChatProcessor";
import { extractLiveChatContinuation } from "./continuation";
import { wrapTryCatch, deepFindObjKey } from "./common";
import logger from "../../../shared/utils/logger";

export const fetchAndProcessLiveChat = async (
    videoId: string,
    windowObj: any,
    signal: AbortSignal,
    dispatch: any
) => {
    logger.start("fetchAndProcessLiveChat");
    try {
        const ytInitialData = windowObj.ytInitialData;
        const continuationResult = extractLiveChatContinuation(ytInitialData);

        if (!continuationResult.continuationData) {
            logger.info("No live chat continuation found. This might not be a live stream or replay.");
            return;
        }

        const continuationData = continuationResult.continuationData;
        const continuation = continuationData.continuation;

        logger.info(`Starting live chat fetch with continuation: ${continuation}`);

        // Initial fetch to determine mode
        const initialResponse = await youtubeApi.fetchLiveChat({
            continuation: continuation,
            isReplay: true, // Assuming replay for now, usually safe for VODs
            signal
        });

        if (!initialResponse) {
             logger.error("Failed to fetch initial live chat.");
             return;
        }

        // Check if it's actually live or replay
        // For now, assume replay if we are running on a VOD
        
        let nextContinuation = null;
        
        const continuations = initialResponse?.continuationContents?.liveChatContinuation?.continuations;
        
        // Try to find playerSeekContinuationData (new replay API)
        const playerSeekData = continuations?.find(
            (c: any) => c.playerSeekContinuationData
        )?.playerSeekContinuationData;

        // Or liveChatReplayContinuationData (old replay API / fallback)
        const liveChatReplayData = continuations?.find(
            (c: any) => c.liveChatReplayContinuationData
        )?.liveChatReplayContinuationData;

        if (playerSeekData) {
             nextContinuation = { continuation: playerSeekData.continuation };
             // We can implement the playerSeek loop here
             await processPlayerSeekLoop(nextContinuation, videoId, signal, dispatch);
        } else if (liveChatReplayData) {
             // Initial batch might have actions
             const actions = initialResponse?.continuationContents?.liveChatContinuation?.actions;
             if (actions) {
                 await saveActions(actions, videoId, dispatch);
             }
             
             nextContinuation = { continuation: liveChatReplayData.continuation };
             await processFallbackLoop(nextContinuation, videoId, signal, dispatch);
        } else {
             // Maybe it's live (not replay)?
             const invalidationContinuation = continuations?.find(
                 (c: any) => c.invalidationContinuationData
             )?.invalidationContinuationData;
             
             if (invalidationContinuation) {
                 logger.info("Detected Live Stream (not replay). Fetching live...");
                 // Handle live stream polling if needed
             }
        }

    } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
             logger.info("Live chat fetch aborted.");
        } else {
             logger.error("Error fetching live chat:", e);
        }
    } finally {
        logger.end("fetchAndProcessLiveChat");
    }
};

async function saveActions(actions: any[], videoId: string, dispatch: any) {
    if (!actions || actions.length === 0) return;
    
    const comments = processLiveChatActions(actions, { currentVideoId: videoId });
    if (comments.length > 0) {
        await db.transaction('rw', db.comments, async () => {
             // We use bulkPut to save comments. 
             // Note: IndexedDB keys are auto-incremented, but we should check for duplicates if we re-run.
             // Our comments have 'commentId'.
             
             // Reuse upsert logic from fetchAndProcessComments if possible, or duplicate it here.
             // upsertComments logic:
             const incomingIds = comments.map(c => c.commentId).filter(Boolean);
             const existingRecords = await db.comments.where('commentId').anyOf(incomingIds).toArray();
             const idMap = new Map(existingRecords.map(c => [c.commentId, c.id]));
             
             const commentsToSave = comments.map(c => {
                 if (idMap.has(c.commentId)) {
                     return { ...c, id: idMap.get(c.commentId) };
                 }
                 const { id, ...rest } = c;
                 return rest;
             });
             
             await db.comments.bulkPut(commentsToSave);
             
             // Update count
             const totalCount = await db.comments.where('videoId').equals(videoId).count();
             dispatch(setTotalCommentsCount(totalCount));
        });
        logger.info(`Saved ${comments.length} live chat messages.`);
    }
}

async function processPlayerSeekLoop(initialToken: any, videoId: string, signal: AbortSignal, dispatch: any) {
    let token = initialToken;
    let currentOffsetTimeMsec = 0;
    
    while (token && !signal.aborted) {
        const params = {
            continuation: token.continuation,
            isReplay: true,
            playerOffsetMs: String(currentOffsetTimeMsec),
            signal
        };
        
        const response = await youtubeApi.fetchLiveChat(params);
        
        const actions = response?.continuationContents?.liveChatContinuation?.actions;
        
        if (actions && actions.length > 0) {
            await saveActions(actions, videoId, dispatch);
            
            const lastOffsetTime = wrapTryCatch(() => {
                 const offsetData = deepFindObjKey(actions[actions.length - 1], 'videoOffsetTimeMsec')[0];
                 return (Object as any).entries(offsetData)[0][1];
            }) as number | undefined;
            
            if (lastOffsetTime !== undefined) {
                currentOffsetTimeMsec = lastOffsetTime;
            }
        }
        
        const continuations = response?.continuationContents?.liveChatContinuation?.continuations;
        const playerSeekData = continuations?.find(
            (c: any) => c.playerSeekContinuationData
        )?.playerSeekContinuationData;
        
        if (playerSeekData) {
            token = { continuation: playerSeekData.continuation };
        } else {
            break;
        }
        
        // Optional: Dispatch progress update
    }
}

async function processFallbackLoop(initialToken: any, videoId: string, signal: AbortSignal, dispatch: any) {
    let token = initialToken;
    
    while (token && !signal.aborted) {
         const response = await youtubeApi.fetchLiveChat({
             continuation: token.continuation,
             isReplay: true,
             signal
         });
         
         const actions = response?.continuationContents?.liveChatContinuation?.actions;
         if (actions) {
             await saveActions(actions, videoId, dispatch);
         }
         
         const continuations = response?.continuationContents?.liveChatContinuation?.continuations;
         const nextContinuation = continuations?.find(
             (c: any) => c.liveChatReplayContinuationData
         )?.liveChatReplayContinuationData;
         
         if (nextContinuation) {
             token = { continuation: nextContinuation.continuation };
         } else {
             break;
         }
    }
}
