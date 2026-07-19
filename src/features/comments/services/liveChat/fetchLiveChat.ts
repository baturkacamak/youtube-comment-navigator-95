import { db } from '../../../shared/utils/database/database';
import { processLiveChatActions } from './liveChatProcessor';
import { extractLiveChatContinuation, ChatContinuationResult } from './continuation';
import { wrapTryCatch, deepFindObjKey } from './common';
import { saveLiveChatMessages } from './liveChatDatabase';
import { devLog } from '../../../devtools/devLogger';

const LIVE_CHAT_SCOPE = 'livechat';

const summarizeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
};

type ResponseContinuationKind =
  | 'playerSeek'
  | 'replay'
  | 'reload'
  | 'timed'
  | 'invalidation'
  | 'unknown';

interface ResponseContinuationResult {
  kind: ResponseContinuationKind;
  data: any;
  source: string | null;
}

const getDeepContinuationValue = (response: any, key: string) => {
  const matches = deepFindObjKey(response, key);
  if (!matches.length) {
    return null;
  }

  const match = matches[matches.length - 1];
  return Object.values(match)[0] ?? null;
};

const extractResponseContinuation = (response: any): ResponseContinuationResult => {
  const continuations = response?.continuationContents?.liveChatContinuation?.continuations;

  const directPlayerSeek = continuations?.find(
    (c: any) => c.playerSeekContinuationData
  )?.playerSeekContinuationData;
  if (directPlayerSeek) {
    return {
      kind: 'playerSeek',
      data: directPlayerSeek,
      source:
        'continuationContents.liveChatContinuation.continuations[].playerSeekContinuationData',
    };
  }

  const directReplay = continuations?.find(
    (c: any) => c.liveChatReplayContinuationData
  )?.liveChatReplayContinuationData;
  if (directReplay) {
    return {
      kind: 'replay',
      data: directReplay,
      source:
        'continuationContents.liveChatContinuation.continuations[].liveChatReplayContinuationData',
    };
  }

  const directReload = continuations?.find(
    (c: any) => c.reloadContinuationData
  )?.reloadContinuationData;
  if (directReload) {
    return {
      kind: 'reload',
      data: directReload,
      source: 'continuationContents.liveChatContinuation.continuations[].reloadContinuationData',
    };
  }

  const directTimed = continuations?.find(
    (c: any) => c.timedContinuationData
  )?.timedContinuationData;
  if (directTimed) {
    return {
      kind: 'timed',
      data: directTimed,
      source: 'continuationContents.liveChatContinuation.continuations[].timedContinuationData',
    };
  }

  const directInvalidation = continuations?.find(
    (c: any) => c.invalidationContinuationData
  )?.invalidationContinuationData;
  if (directInvalidation) {
    return {
      kind: 'invalidation',
      data: directInvalidation,
      source:
        'continuationContents.liveChatContinuation.continuations[].invalidationContinuationData',
    };
  }

  const playerSeekData = getDeepContinuationValue(response, 'playerSeekContinuationData');
  if (playerSeekData) {
    return {
      kind: 'playerSeek',
      data: playerSeekData,
      source: 'deepSearch(playerSeekContinuationData)',
    };
  }

  const replayData = getDeepContinuationValue(response, 'liveChatReplayContinuationData');
  if (replayData) {
    return {
      kind: 'replay',
      data: replayData,
      source: 'deepSearch(liveChatReplayContinuationData)',
    };
  }

  const reloadData = getDeepContinuationValue(response, 'reloadContinuationData');
  if (reloadData) {
    return {
      kind: 'reload',
      data: reloadData,
      source: 'deepSearch(reloadContinuationData)',
    };
  }

  const timedData = getDeepContinuationValue(response, 'timedContinuationData');
  if (timedData) {
    return {
      kind: 'timed',
      data: timedData,
      source: 'deepSearch(timedContinuationData)',
    };
  }

  const invalidationData = getDeepContinuationValue(response, 'invalidationContinuationData');
  if (invalidationData) {
    return {
      kind: 'invalidation',
      data: invalidationData,
      source: 'deepSearch(invalidationContinuationData)',
    };
  }

  return {
    kind: 'unknown',
    data: null,
    source: null,
  };
};

interface LiveChatDiagnosticsPayload {
  currentVideoId?: string | null;
  readyState?: string;
  locationHref?: string;
  pageDataVideoId?: string | null;
  isWatchPageLoading?: boolean;
  hasLiveChatFrame?: boolean;
  hasYtInitialData?: boolean;
  hasYtcfg?: boolean;
  hasInnertubeClient?: boolean;
  hasInnertubeApiKey?: boolean;
  conversationBarKeys?: string[];
  hasLiveChatRenderer?: boolean;
  sortMenuItemCount?: number;
  rawContinuationKeys?: string[];
  continuation?: {
    continuationData?: any;
    apiVersion?: 'new' | 'old' | 'fallback';
    sourcePath?: string | null;
    continuationType?: 'reload' | 'replay' | 'playerSeek' | null;
    error?: string;
  } | null;
  error?: string;
}

const requestLiveChatDiagnosticsOnce = async (
  timeoutMs: number = 1500
): Promise<LiveChatDiagnosticsPayload | null> => {
  const requestId = `livechat-diag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return new Promise((resolve) => {
    let settled = false;

    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeoutHandle);
    };

    const finish = (payload: LiveChatDiagnosticsPayload | null) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(payload);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type !== 'YCN_LIVE_CHAT_DIAGNOSTICS') return;
      if (event.data?.requestId !== requestId) return;
      finish((event.data?.payload || null) as LiveChatDiagnosticsPayload | null);
    };

    const timeoutHandle = window.setTimeout(() => {
      finish(null);
    }, timeoutMs);

    window.addEventListener('message', handleMessage);
    window.postMessage({ type: 'YCN_REQUEST_LIVE_CHAT_DIAGNOSTICS', requestId }, '*');
  });
};

interface LiveChatFetchBridgeResponse {
  ok: boolean;
  status?: number;
  statusText?: string;
  body?: any;
  diagnostics?: Record<string, unknown>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

const requestLiveChatFetch = async (payload: {
  continuation: string;
  isReplay?: boolean;
  playerOffsetMs?: string;
  clickTrackingParams?: string;
}): Promise<LiveChatFetchBridgeResponse> => {
  const requestId = `livechat-fetch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeoutHandle);
    };

    const finishResolve = (value: LiveChatFetchBridgeResponse) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const finishReject = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type !== 'YCN_LIVE_CHAT_FETCH_RESULT') return;
      if (event.data?.requestId !== requestId) return;
      finishResolve((event.data?.payload || { ok: false }) as LiveChatFetchBridgeResponse);
    };

    const timeoutHandle = window.setTimeout(() => {
      finishReject(new Error('Main world live chat fetch timed out'));
    }, 15000);

    window.addEventListener('message', handleMessage);
    window.postMessage({ type: 'YCN_REQUEST_LIVE_CHAT_FETCH', requestId, ...payload }, '*');
  });
};

const fetchLiveChatPayload = async (params: {
  continuation: string;
  isReplay?: boolean;
  playerOffsetMs?: string;
  clickTrackingParams?: string;
  signal?: AbortSignal;
}): Promise<any> => {
  if (params.signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }

  const { signal: _signal, ...bridgePayload } = params;
  const response = await requestLiveChatFetch(bridgePayload);

  if (_signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }

  if (!response.ok) {
    const bridgeMessage = response.error
      ? `Live chat main world fetch failed: ${response.error.name || 'Error'} ${response.error.message || ''}`.trim()
      : `Live chat main world fetch failed: ${response.status} ${response.statusText}${response.body ? ` - ${JSON.stringify(response.body).slice(0, 500)}` : ''}`;

    const error = new Error(bridgeMessage);
    (error as Error & { cause?: unknown }).cause = response;
    throw error;
  }

  return response.body;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const requestLiveChatDiagnostics = async (
  videoId: string,
  timeoutMs: number = 12000,
  intervalMs: number = 250
): Promise<LiveChatDiagnosticsPayload | null> => {
  let deadline = Date.now() + timeoutMs;
  const liveChatFrameDeadline = Date.now() + 60000;
  let lastPayload: LiveChatDiagnosticsPayload | null = null;

  while (Date.now() < deadline) {
    lastPayload = await requestLiveChatDiagnosticsOnce(Math.min(intervalMs, 1000));

    const payloadVideoId = lastPayload?.currentVideoId || null;
    const continuationData = lastPayload?.continuation?.continuationData;
    const continuationToken = continuationData?.continuation || null;
    const videoMatches = payloadVideoId === videoId;

    if (videoMatches && continuationToken) {
      return lastPayload;
    }

    // The native chat frame is created before its iframe receives a replay
    // continuation during SPA navigation. Once that frame is visible, give
    // YouTube enough time to populate its iframe URL.
    if (lastPayload?.hasLiveChatFrame) {
      deadline = Math.max(deadline, liveChatFrameDeadline);
    }

    // YouTube navigation is client-side. The URL can change before the new
    // watch page has populated its conversation bar, so keep polling while
    // that page is still loading instead of treating the missing continuation
    // as proof that the video has no chat replay.
    if (
      videoMatches &&
      lastPayload?.pageDataVideoId === videoId &&
      lastPayload.isWatchPageLoading === false
    ) {
      return lastPayload;
    }

    await sleep(intervalMs);
  }

  return lastPayload;
};

export const fetchAndProcessLiveChat = async (
  videoId: string,
  windowObj: any,
  signal: AbortSignal
) => {
  try {
    const diagnostics = await requestLiveChatDiagnostics(videoId);

    let continuationResult: ChatContinuationResult | null = diagnostics?.continuation
      ?.continuationData
      ? {
          continuationData: diagnostics.continuation.continuationData,
          apiVersion: diagnostics.continuation.apiVersion ?? 'fallback',
          sourcePath: diagnostics.continuation.sourcePath ?? undefined,
          continuationType: diagnostics.continuation.continuationType ?? undefined,
        }
      : null;

    if (!continuationResult && windowObj?.ytInitialData) {
      continuationResult = extractLiveChatContinuation(windowObj.ytInitialData);
    }

    if (!continuationResult) {
      devLog('error', LIVE_CHAT_SCOPE, 'Live chat diagnostics returned no continuation', {
        videoId,
        hasWindowObject: Boolean(windowObj),
        hasContentScriptYtInitialData: Boolean(windowObj?.ytInitialData),
        diagnostics,
      });
      throw new Error("This video doesn't have live chat");
    }

    if (!continuationResult.continuationData) {
      devLog('error', LIVE_CHAT_SCOPE, 'Live chat continuation data missing', {
        videoId,
        continuationType: continuationResult.continuationType ?? null,
        apiVersion: continuationResult.apiVersion,
        sourcePath: continuationResult.sourcePath ?? null,
      });
      throw new Error('Live chat replay not available for this video');
    }

    const continuationData = continuationResult.continuationData;
    const continuation = continuationData.continuation;
    if (!continuation) {
      devLog('error', LIVE_CHAT_SCOPE, 'Live chat continuation token missing', {
        videoId,
        continuationType: continuationResult.continuationType ?? null,
        sourcePath: continuationResult.sourcePath ?? null,
        continuationDataKeys: Object.keys(continuationData || {}),
      });
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
      initialResponse = await fetchLiveChatPayload({
        continuation: continuation,
        isReplay: isReplayMode,
        clickTrackingParams,
        signal,
      });
    } catch (error) {
      if (!isReplayMode && continuationResult.continuationType === 'reload') {
        try {
          initialResponse = await fetchLiveChatPayload({
            continuation: continuation,
            isReplay: true,
            clickTrackingParams,
            signal,
          });
        } catch (retryError) {
          devLog('error', LIVE_CHAT_SCOPE, 'Replay-mode retry failed', {
            videoId,
            error: summarizeError(retryError),
          });
          throw new Error('Failed to load chat messages');
        }
      } else {
        throw error; // Re-throw the original error
      }
    }

    if (!initialResponse) {
      devLog('error', LIVE_CHAT_SCOPE, 'Initial live chat response was empty', {
        videoId,
      });
      throw new Error('Failed to load chat messages');
    }

    const continuations =
      initialResponse?.continuationContents?.liveChatContinuation?.continuations;
    const actions = initialResponse?.continuationContents?.liveChatContinuation?.actions;

    if (actions) {
      await saveActions(actions, videoId);
    }

    const nextContinuation = extractResponseContinuation(initialResponse);

    if (nextContinuation.kind === 'playerSeek' && nextContinuation.data?.continuation) {
      await processPlayerSeekLoop(
        { continuation: nextContinuation.data.continuation },
        videoId,
        signal
      );
    } else if (nextContinuation.kind === 'replay' && nextContinuation.data?.continuation) {
      await processFallbackLoop(
        { continuation: nextContinuation.data.continuation },
        videoId,
        signal
      );
    } else if (nextContinuation.kind === 'reload' && nextContinuation.data?.continuation) {
      await processReloadLoop(
        {
          continuation: nextContinuation.data.continuation,
          clickTrackingParams: nextContinuation.data.clickTrackingParams,
        },
        videoId,
        signal
      );
    } else if (
      continuationResult.continuationType === 'playerSeek' &&
      nextContinuation.kind === 'unknown'
    ) {
    } else if (
      continuationResult.continuationType === 'replay' &&
      nextContinuation.kind === 'unknown'
    ) {
    } else {
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw e;
    } else {
      devLog('error', LIVE_CHAT_SCOPE, 'Live chat fetch failed', {
        videoId,
        error: summarizeError(e),
      });
      throw e;
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
    // Save messages to liveChatMessages table
    if (processedData.messages.length > 0) {
      try {
        const savedCount = await saveLiveChatMessages(processedData.messages, videoId);
      } catch (saveError: any) {
        devLog('error', LIVE_CHAT_SCOPE, 'Failed to save live chat messages', {
          videoId,
          attemptedCount: processedData.messages.length,
          error: summarizeError(saveError),
        });
        throw saveError;
      }
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
    devLog('error', LIVE_CHAT_SCOPE, 'saveActions failed', {
      videoId,
      actionCount: actions.length,
      error: summarizeError(error),
    });
    throw error; // Re-throw to propagate to caller
  }
}

async function processPlayerSeekLoop(initialToken: any, videoId: string, signal: AbortSignal) {
  let token = initialToken;
  let currentOffsetTimeMsec = '0';
  let loopCount = 0;
  let emptyActionLoops = 0;
  let stagnantLoopCount = 0;
  const maxEmptyActionLoops = 2;
  const maxLoopCount = 500;
  const maxStagnantLoops = 3;

  while (token && !signal.aborted) {
    loopCount++;
    if (loopCount > maxLoopCount) {
      break;
    }

    const params = {
      continuation: token.continuation,
      isReplay: true,
      playerOffsetMs: currentOffsetTimeMsec,
      signal,
    };

    try {
      const response = await fetchLiveChatPayload(params);

      const actions = response?.continuationContents?.liveChatContinuation?.actions;

      let lastOffsetTime: string | undefined;
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

        lastOffsetTime = wrapTryCatch(() => {
          const offsetData = deepFindObjKey(actions[actions.length - 1], 'videoOffsetTimeMsec')[0];
          return String((Object as any).entries(offsetData)[0][1]);
        }) as string | undefined;

        if (lastOffsetTime === undefined) {
        }
        emptyActionLoops = 0;
      } else {
        emptyActionLoops += 1;
        if (emptyActionLoops >= maxEmptyActionLoops) {
          break;
        }
      }

      const continuations = response?.continuationContents?.liveChatContinuation?.continuations;
      const nextContinuation = extractResponseContinuation(response);
      const nextTokenValue = nextContinuation.data?.continuation
        ? String(nextContinuation.data.continuation)
        : null;
      const currentTokenValue = token?.continuation ? String(token.continuation) : null;
      const offsetUnchanged =
        lastOffsetTime !== undefined && currentOffsetTimeMsec === lastOffsetTime;

      if (nextContinuation.kind === 'playerSeek' && nextContinuation.data?.continuation) {
        if (offsetUnchanged) {
          stagnantLoopCount += 1;

          if (currentTokenValue === nextTokenValue && stagnantLoopCount >= maxStagnantLoops) {
            const replayContinuation = continuations?.find(
              (c: any) => c.liveChatReplayContinuationData
            )?.liveChatReplayContinuationData;

            if (replayContinuation?.continuation) {
              await processFallbackLoop(
                { continuation: replayContinuation.continuation },
                videoId,
                signal
              );
              break;
            }

            break;
          }
        } else {
          stagnantLoopCount = 0;
          if (lastOffsetTime !== undefined) {
            currentOffsetTimeMsec = lastOffsetTime;
          }
        }

        token = { continuation: nextContinuation.data.continuation };
      } else if (nextContinuation.kind === 'replay' && nextContinuation.data?.continuation) {
        await processFallbackLoop(
          { continuation: nextContinuation.data.continuation },
          videoId,
          signal
        );
        break;
      } else if (nextContinuation.kind === 'reload' && nextContinuation.data?.continuation) {
        await processReloadLoop(
          {
            continuation: nextContinuation.data.continuation,
            clickTrackingParams: nextContinuation.data.clickTrackingParams,
          },
          videoId,
          signal
        );
        break;
      } else {
        break;
      }
    } catch (loopError) {
      devLog('error', LIVE_CHAT_SCOPE, 'PlayerSeek loop request failed', {
        videoId,
        loopCount,
        currentOffsetTimeMsec,
        error: summarizeError(loopError),
      });
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
      const response = await fetchLiveChatPayload({
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
      const nextContinuation = extractResponseContinuation(response);

      if (nextContinuation.kind === 'replay' && nextContinuation.data?.continuation) {
        token = { continuation: nextContinuation.data.continuation };
      } else if (nextContinuation.kind === 'playerSeek' && nextContinuation.data?.continuation) {
        await processPlayerSeekLoop(
          { continuation: nextContinuation.data.continuation },
          videoId,
          signal
        );
        break;
      } else if (nextContinuation.kind === 'reload' && nextContinuation.data?.continuation) {
        await processReloadLoop(
          {
            continuation: nextContinuation.data.continuation,
            clickTrackingParams: nextContinuation.data.clickTrackingParams,
          },
          videoId,
          signal
        );
        break;
      } else {
        break;
      }
    } catch (loopError) {
      devLog('error', LIVE_CHAT_SCOPE, 'Fallback replay loop request failed', {
        videoId,
        loopCount,
        error: summarizeError(loopError),
      });
      break;
    }
  }
}

async function processReloadLoop(
  initialToken: { continuation: string; clickTrackingParams?: string },
  videoId: string,
  signal: AbortSignal
) {
  let token = initialToken;
  let loopCount = 0;
  let emptyActionLoops = 0;
  const maxEmptyActionLoops = 2;
  const maxLoopCount = 500;

  while (token?.continuation && !signal.aborted) {
    loopCount++;
    if (loopCount > maxLoopCount) {
      break;
    }

    try {
      const response = await fetchLiveChatPayload({
        continuation: token.continuation,
        isReplay: false,
        clickTrackingParams: token.clickTrackingParams,
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

      const nextContinuation = extractResponseContinuation(response);
      if (nextContinuation.kind === 'reload' && nextContinuation.data?.continuation) {
        token = {
          continuation: nextContinuation.data.continuation,
          clickTrackingParams: nextContinuation.data.clickTrackingParams,
        };
      } else if (nextContinuation.kind === 'replay' && nextContinuation.data?.continuation) {
        await processFallbackLoop(
          { continuation: nextContinuation.data.continuation },
          videoId,
          signal
        );
        break;
      } else if (nextContinuation.kind === 'playerSeek' && nextContinuation.data?.continuation) {
        await processPlayerSeekLoop(
          { continuation: nextContinuation.data.continuation },
          videoId,
          signal
        );
        break;
      } else {
        break;
      }
    } catch (loopError) {
      devLog('error', LIVE_CHAT_SCOPE, 'Reload loop request failed', {
        videoId,
        loopCount,
        error: summarizeError(loopError),
      });
      break;
    }
  }
}
