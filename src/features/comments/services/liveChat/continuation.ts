import { deepFindObjKey, wrapTryCatch } from './common';

export interface ChatContinuationResult {
  continuationData: any;
  apiVersion: 'new' | 'old' | 'fallback';
  sourcePath?: string;
  continuationType?: 'reload' | 'replay' | 'playerSeek';
}

export function extractLiveChatContinuation(ytData: any): ChatContinuationResult {
  try {
    if (ytData) {
      // Check in standard location
      const continuations = wrapTryCatch(
        () =>
          ytData.contents?.twoColumnWatchNextResults?.conversationBar?.liveChatRenderer
            ?.continuations
      );

      if (continuations && continuations.length > 0) {
        const continuationItem = continuations[0];

        if (continuationItem.reloadContinuationData) {
          return {
            continuationData: continuationItem.reloadContinuationData,
            apiVersion: 'new',
            sourcePath: 'continuations[0].reloadContinuationData',
            continuationType: 'reload',
          };
        }
        if (continuationItem.liveChatReplayContinuationData) {
          return {
            continuationData: continuationItem.liveChatReplayContinuationData,
            apiVersion: 'new',
            sourcePath: 'continuations[0].liveChatReplayContinuationData',
            continuationType: 'replay',
          };
        }
        if (continuationItem.playerSeekContinuationData) {
          return {
            continuationData: continuationItem.playerSeekContinuationData,
            apiVersion: 'new',
            sourcePath: 'continuations[0].playerSeekContinuationData',
            continuationType: 'playerSeek',
          };
        }
      }

      const oldApiData = wrapTryCatch(
        () =>
          ytData[3]?.response?.contents?.twoColumnWatchNextResults?.conversationBar
            ?.liveChatRenderer?.header?.liveChatHeaderRenderer?.viewSelector
            ?.sortFilterSubMenuRenderer?.subMenuItems[1]?.continuation?.reloadContinuationData
      );

      if (oldApiData) {
        return {
          continuationData: oldApiData,
          apiVersion: 'old',
          sourcePath:
            '[3].response.header.viewSelector.sortFilterSubMenuRenderer.subMenuItems[1].continuation.reloadContinuationData',
          continuationType: 'reload',
        };
      }

      // Fallback: deep search for any known continuation key
      const rCData = deepFindObjKey(ytData, 'reloadContinuationData');
      if (rCData.length > 0) {
        const fallbackData = Object.values(rCData[rCData.length - 1])[0] as object;
        return {
          continuationData: fallbackData,
          apiVersion: 'fallback',
          sourcePath: 'deepSearch(reloadContinuationData)',
          continuationType: 'reload',
        };
      }

      const lCRData = deepFindObjKey(ytData, 'liveChatReplayContinuationData');
      if (lCRData.length > 0) {
        const fallbackData = Object.values(lCRData[lCRData.length - 1])[0] as object;
        return {
          continuationData: fallbackData,
          apiVersion: 'fallback',
          sourcePath: 'deepSearch(liveChatReplayContinuationData)',
          continuationType: 'replay',
        };
      }
    }

    return {
      continuationData: null,
      apiVersion: 'fallback',
      sourcePath: undefined,
    };
  } catch (e) {
    console.error(e);
    return {
      continuationData: null,
      apiVersion: 'fallback',
      sourcePath: undefined,
    };
  }
}
