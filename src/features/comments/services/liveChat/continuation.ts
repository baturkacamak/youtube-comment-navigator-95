import { deepFindObjKey, wrapTryCatch } from "./common";

export interface ChatContinuationResult {
    continuationData: any;
    apiVersion: 'new' | 'old' | 'fallback';
    sourcePath?: string;
}

export function extractLiveChatContinuation(ytData: any): ChatContinuationResult {
    try {
        if (ytData) {
            const newApiData = wrapTryCatch(
                () =>
                    ytData.contents?.twoColumnWatchNextResults?.conversationBar?.liveChatRenderer?.continuations[0]
                        .reloadContinuationData
            );

            if (newApiData) {
                return {
                    continuationData: newApiData,
                    apiVersion: 'new',
                    sourcePath: 'continuations[0].reloadContinuationData'
                };
            }

            const oldApiData = wrapTryCatch(
                () =>
                    ytData[3]?.response?.contents?.twoColumnWatchNextResults?.conversationBar?.liveChatRenderer?.header
                        ?.liveChatHeaderRenderer?.viewSelector?.sortFilterSubMenuRenderer?.subMenuItems[1]?.continuation
                        ?.reloadContinuationData
            );

            if (oldApiData) {
                return {
                    continuationData: oldApiData,
                    apiVersion: 'old',
                    sourcePath:
                        '[3].response.header.viewSelector.sortFilterSubMenuRenderer.subMenuItems[1].continuation.reloadContinuationData'
                };
            }

            const rCData = deepFindObjKey(ytData, 'reloadContinuationData');
            if (rCData.length > 0) {
                const fallbackData = Object.values(rCData[rCData.length - 1])[0] as object;
                return {
                    continuationData: fallbackData,
                    apiVersion: 'fallback',
                    sourcePath: 'deepSearch(reloadContinuationData)'
                };
            }
        }

        return {
            continuationData: null,
            apiVersion: 'fallback',
            sourcePath: undefined
        };
    } catch (e) {
        console.error(e);
        return {
            continuationData: null,
            apiVersion: 'fallback',
            sourcePath: undefined
        };
    }
}
