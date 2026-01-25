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

        logger.info(`[LiveChat] Continuation extraction result:`, continuationResult);

        if (!continuationResult.continuationData) {
            logger.info("No live chat continuation found. This might not be a live stream or replay.");
            return;
        }

        const continuationData = continuationResult.continuationData;
        const continuation = continuationData.continuation;
        // If we found a replay/seek token, we MUST use isReplay=true for the API call
        const isReplayMode = continuationResult.continuationType === 'replay' || continuationResult.continuationType === 'playerSeek';

        logger.info(`Starting live chat fetch with continuation: ${continuation.substring(0, 20)}..., isReplay: ${isReplayMode}, type: ${continuationResult.continuationType}`);

        // Initial fetch to determine mode
        const initialResponse = await youtubeApi.fetchLiveChat({
            continuation: continuation,
            isReplay: isReplayMode,
            signal
        });

        if (!initialResponse) {
             logger.error("Failed to fetch initial live chat.");
             return;
        }

        const continuations = initialResponse?.continuationContents?.liveChatContinuation?.continuations;
        const actions = initialResponse?.continuationContents?.liveChatContinuation?.actions;
        
        logger.debug(`[LiveChat] Initial response continuations:`, continuations);
        if (actions) {
            logger.info(`[LiveChat] Initial batch has ${actions.length} actions.`);
            await saveActions(actions, videoId, dispatch);
        }

        // Try to find playerSeekContinuationData (new replay API)
        const playerSeekData = continuations?.find(
            (c: any) => c.playerSeekContinuationData
        )?.playerSeekContinuationData;

        // Or liveChatReplayContinuationData (old replay API / fallback)
        const liveChatReplayData = continuations?.find(
            (c: any) => c.liveChatReplayContinuationData
        )?.liveChatReplayContinuationData;
        
        // If the initial token was already playerSeek, we might want to continue in that mode even if response looks different,
        // but usually the response gives us the NEXT token.
        
        if (playerSeekData) {
             logger.info("[LiveChat] Mode: PlayerSeek (New API)");
             const nextContinuation = { continuation: playerSeekData.continuation };
             await processPlayerSeekLoop(nextContinuation, videoId, signal, dispatch);
        } else if (liveChatReplayData) {
             logger.info("[LiveChat] Mode: Fallback (Old API)");
             const nextContinuation = { continuation: liveChatReplayData.continuation };
             await processFallbackLoop(nextContinuation, videoId, signal, dispatch);
        } else if (continuationResult.continuationType === 'playerSeek' && !playerSeekData && !liveChatReplayData) {
             // We started with playerSeek but got no new token? This might be end of stream or error.
             logger.warn("[LiveChat] Started with PlayerSeek but received no continuation. End of chat?");
        } else if (continuationResult.continuationType === 'replay' && !liveChatReplayData) {
             logger.warn("[LiveChat] Started with Replay but received no continuation. End of chat?");
        } else {
             // Maybe it's live (not replay)?
             const invalidationContinuation = continuations?.find(
                 (c: any) => c.invalidationContinuationData
             )?.invalidationContinuationData;
             
             // Or timedContinuationData (live stream)
             const timedContinuation = continuations?.find(
                 (c: any) => c.timedContinuationData
             )?.timedContinuationData;
             
             if (invalidationContinuation || timedContinuation) {
                 logger.info("[LiveChat] Detected Live Stream (not replay). Fetching live... (Not fully implemented yet)");
             } else {
                 logger.warn("[LiveChat] No known continuation type found. Stopping.", continuations);
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
    if (!actions || actions.length === 0) {
        logger.debug("[LiveChat] No actions to save.");
        return;
    }
    
    logger.debug(`[LiveChat] Processing ${actions.length} raw actions...`);
    const comments = processLiveChatActions(actions, { currentVideoId: videoId });
    
    if (comments.length > 0) {
        try {
            await db.transaction('rw', db.comments, async () => {
                 // Reuse upsert logic from fetchAndProcessComments if possible, or duplicate it here.
                 // upsertComments logic:
                 const incomingIds = comments.map(c => c.commentId).filter(Boolean);
                 const existingRecords = await db.comments.where('commentId').anyOf(incomingIds).toArray();
                 const idMap = new Map(existingRecords.map(c => [c.commentId, c.id]));
                 
                 const commentsToSave = comments.map(c => {
                     if (idMap.has(c.commentId)) {
                         return { ...c, id: idMap.get(c.commentId) };
                     }
                     // Cast to any to safely destructure id even if it doesn't exist on the object runtime-wise or if TS complains
                     const { id, ...rest } = c as any;
                     return rest;
                 });
                 
                 await db.comments.bulkPut(commentsToSave);
                 
                 // Update count - Note: we might want to skip this for performance if too frequent, 
                 // but for now it helps debug visibility.
                 const totalCount = await db.comments.where('videoId').equals(videoId).count();
                 // dispatch(setTotalCommentsCount(totalCount)); // This updates the global count, confusing if separate tab? 
                 // Actually, if we want to show chat in its own tab, we might not want to mix counts?
                 // But let's leave it for now.
            });
            logger.info(`[LiveChat] Saved ${comments.length} processed comments.`);
        } catch (dbError) {
            logger.error(`[LiveChat] Database error saving comments:`, dbError);
        }
    } else {
        logger.warn(`[LiveChat] Actions were present but resulted in 0 processed comments.`);
    }
}

async function processPlayerSeekLoop(initialToken: any, videoId: string, signal: AbortSignal, dispatch: any) {
    let token = initialToken;
    let currentOffsetTimeMsec = 0;
    let loopCount = 0;
    
    logger.start("[LiveChat] Starting PlayerSeek Loop");

    while (token && !signal.aborted) {
        loopCount++;
        // Log every 5 loops to avoid spam, or strictly debug
        if (loopCount % 5 === 0) logger.debug(`[LiveChat] Loop ${loopCount}, Offset: ${currentOffsetTimeMsec}ms`);

        const params = {
            continuation: token.continuation,
            isReplay: true,
            playerOffsetMs: String(currentOffsetTimeMsec),
            signal
        };
        
        try {
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
            } else {
                 logger.debug(`[LiveChat] Loop ${loopCount}: No actions in response.`);
            }
            
            const continuations = response?.continuationContents?.liveChatContinuation?.continuations;
            const playerSeekData = continuations?.find(
                (c: any) => c.playerSeekContinuationData
            )?.playerSeekContinuationData;
            
            if (playerSeekData) {
                token = { continuation: playerSeekData.continuation };
            } else {
                logger.info(`[LiveChat] Loop ${loopCount}: No playerSeekContinuationData found. Stopping.`);
                break;
            }
        } catch (loopError) {
            logger.error(`[LiveChat] Loop error at offset ${currentOffsetTimeMsec}:`, loopError);
            break; 
        }
    }
    logger.end("[LiveChat] PlayerSeek Loop Finished");
}

async function processFallbackLoop(initialToken: any, videoId: string, signal: AbortSignal, dispatch: any) {
    let token = initialToken;
    let loopCount = 0;
    
    logger.start("[LiveChat] Starting Fallback Loop");
    
    while (token && !signal.aborted) {
         loopCount++;
         if (loopCount % 5 === 0) logger.debug(`[LiveChat] Fallback Loop ${loopCount}`);

         try {
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
                 logger.info(`[LiveChat] Fallback Loop ${loopCount}: No liveChatReplayContinuationData found. Stopping.`);
                 break;
             }
         } catch (loopError) {
             logger.error(`[LiveChat] Fallback loop error:`, loopError);
             break;
         }
    }
    logger.end("[LiveChat] Fallback Loop Finished");
}
