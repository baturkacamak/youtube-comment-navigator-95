import { youtubeApi } from '../../../shared/services/youtubeApi';
import { db } from '../../../shared/utils/database/database';
import { processLiveChatActions } from './liveChatProcessor';
import { extractLiveChatContinuation } from './continuation';
import { wrapTryCatch, deepFindObjKey } from './common';
import { saveLiveChatMessages } from './liveChatDatabase';

export const fetchAndProcessLiveChat = async (
  videoId: string,
  windowObj: any,
  signal: AbortSignal
) => {
  try {
    if (!windowObj || !windowObj.ytInitialData) {
      throw new Error("This video doesn't have live chat");
    }

    const ytInitialData = windowObj.ytInitialData;
    const continuationResult = extractLiveChatContinuation(ytInitialData);


    if (!continuationResult.continuationData) {
      throw new Error('Live chat replay not available for this video');
    }

    const continuationData = continuationResult.continuationData;
    const continuation = continuationData.continuation;
    if (!continuation) {
      throw new Error("This video doesn't have live chat");
    }
    const clickTrackingParams = continuationData.clickTrackingParams;
    // If we found a replay/seek token, we MUST use isReplay=true for the API call
    const isReplayMode =
      continuationResult.continuationType === 'replay' ||
      continuationResult.continuationType === 'playerSeek';


    // Initial fetch to determine mode
    let initialResponse: any;
    try {
      initialResponse = await youtubeApi.fetchLiveChat({
        continuation: continuation,
        isReplay: isReplayMode,
        clickTrackingParams,
        signal,
      });
    } catch (error) {
      // If we started with reload continuation, retry using replay endpoint (matches YCS-cont flow)
      if (!isReplayMode && continuationResult.continuationType === 'reload') {
        try {
          initialResponse = await youtubeApi.fetchLiveChat({
            continuation: continuation,
            isReplay: true,
            clickTrackingParams,
            signal,
          });
        } catch (retryError) {
          throw new Error('Failed to load chat messages');
        }
      } else {
        throw error; // Re-throw the original error
      }
    }

    if (!initialResponse) {
      throw new Error('Failed to load chat messages');
    }

    const continuations =
      initialResponse?.continuationContents?.liveChatContinuation?.continuations;
    const actions = initialResponse?.continuationContents?.liveChatContinuation?.actions;

    if (!initialResponse?.continuationContents?.liveChatContinuation) {
    }
    if (actions) {
      await saveActions(actions, videoId);
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
      const nextContinuation = { continuation: playerSeekData.continuation };
      await processPlayerSeekLoop(nextContinuation, videoId, signal);
    } else if (liveChatReplayData) {
      const nextContinuation = { continuation: liveChatReplayData.continuation };
      await processFallbackLoop(nextContinuation, videoId, signal);
    } else if (
      continuationResult.continuationType === 'playerSeek' &&
      !playerSeekData &&
      !liveChatReplayData
    ) {
      // We started with playerSeek but got no new token? This might be end of stream or error.
    } else if (continuationResult.continuationType === 'replay' && !liveChatReplayData) {
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
      } else {
      }
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
    } else {
    }
  } finally {
  }
};

/**
 * Save livechat actions to database with extensive error handling
 * Separates messages (saved to liveChatMessages) from replies (saved to comments)
 */
async function saveActions(actions: any[], videoId: string) {
  if (!actions || actions.length === 0) {
    return;
  }

  try {
    const processedData = processLiveChatActions(actions, { currentVideoId: videoId });

    // Log any parsing errors
    if (processedData.errors.length > 0) {
      processedData.errors.forEach((error, idx) => {
      });
    }

    // Save messages to liveChatMessages table
    if (processedData.messages.length > 0) {
      try {
        const savedCount = await saveLiveChatMessages(processedData.messages, videoId);
      } catch (saveError: any) {
        throw saveError;
      }
    } else {
    }

    // Save replies to comments table
    if (processedData.replies.length > 0) {
      try {
        await db.transaction('rw', db.comments, async () => {
          // Upsert logic for replies
          const incomingIds = processedData.replies.map((r) => r.commentId).filter(Boolean);
          const existingRecords = await db.comments.where('commentId').anyOf(incomingIds).toArray();
          const idMap = new Map(existingRecords.map((c) => [c.commentId, c.id]));

          const repliesToSave = processedData.replies.map((r) => {
            if (idMap.has(r.commentId)) {
              return { ...r, id: idMap.get(r.commentId) };
            }
            const rest = { ...r } as any;
            delete rest.id;
            return rest;
          });

          await db.comments.bulkPut(repliesToSave);
        });
      } catch (replyError: any) {
        // Don't throw - messages were saved successfully
      }
    }
  } catch (error: any) {
    throw error; // Re-throw to propagate to caller
  }
}

async function processPlayerSeekLoop(initialToken: any, videoId: string, signal: AbortSignal) {
  let token = initialToken;
  let currentOffsetTimeMsec = 0;
  let loopCount = 0;
  let emptyActionLoops = 0;
  const maxEmptyActionLoops = 2;
  const maxLoopCount = 500;


  while (token && !signal.aborted) {
    loopCount++;
    if (loopCount > maxLoopCount) {
      break;
    }

    const params = {
      continuation: token.continuation,
      isReplay: true,
      playerOffsetMs: String(currentOffsetTimeMsec),
      signal,
    };

    try {
      const response = await youtubeApi.fetchLiveChat(params);

      const actions = response?.continuationContents?.liveChatContinuation?.actions;

      if (actions && actions.length > 0) {
        // Dispatch is unused in saveActions anyway if we remove it, but saveActions expects 3 args currently.
        // We need to update saveActions signature or pass null/undefined if it's not used.
        // Actually, let's check saveActions signature. It takes (actions, videoId, dispatch).
        // I should pass null or remove dispatch from saveActions too.
        // Let's pass null for now to minimize changes in this call, or better, remove it if unused in saveActions.
        // Looking at saveActions code: it calls processLiveChatActions and db.
        // It does NOT use dispatch.
        // So I will remove dispatch from saveActions as well.
        await saveActions(actions, videoId);

        const lastOffsetTime = wrapTryCatch(() => {
          const offsetData = deepFindObjKey(actions[actions.length - 1], 'videoOffsetTimeMsec')[0];
          return (Object as any).entries(offsetData)[0][1];
        }) as number | undefined;

        if (lastOffsetTime !== undefined) {
          if (currentOffsetTimeMsec === lastOffsetTime) {
            break;
          }
          currentOffsetTimeMsec = lastOffsetTime;
        }
        emptyActionLoops = 0;
      } else {
        emptyActionLoops += 1;
        if (emptyActionLoops >= maxEmptyActionLoops) {
          break;
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
    } catch (loopError) {
      break;
    }
  }
}

async function processFallbackLoop(initialToken: any, videoId: string, signal: AbortSignal) {
  let token = initialToken;
  let loopCount = 0;
  let emptyActionLoops = 0;
  const maxEmptyActionLoops = 2;
  const maxLoopCount = 500;


  while (token && !signal.aborted) {
    loopCount++;
    if (loopCount > maxLoopCount) {
      break;
    }

    try {
      const response = await youtubeApi.fetchLiveChat({
        continuation: token.continuation,
        isReplay: true,
        signal,
      });

      const actions = response?.continuationContents?.liveChatContinuation?.actions;
      if (actions && actions.length > 0) {
        await saveActions(actions, videoId);
        emptyActionLoops = 0;
      } else {
        emptyActionLoops += 1;
        if (emptyActionLoops >= maxEmptyActionLoops) {
          break;
        }
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
    } catch (loopError) {
      break;
    }
  }
}
