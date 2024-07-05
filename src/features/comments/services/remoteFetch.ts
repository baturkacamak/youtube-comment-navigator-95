import { fetchCommentJsonDataFromRemote } from "./fetchCommentJsonDataFromRemote";
import { extractYouTubeVideoIdFromUrl } from "../../shared/utils/extractYouTubeVideoIdFromUrl";
import { getCachedDataIfValid, removeDataFromDB } from "../../shared/utils/cacheUtils";
import { CommentData } from "../../../types/commentTypes";
import { CACHE_KEYS } from "../../shared/utils/environmentVariables";
import { processRawJsonCommentsData } from "../utils/comments/retrieveYouTubeCommentPaths";
import { setIsLoading } from "../../../store/store";

const extractContinuationToken = (continuationItems: any[]): string | null => {
    if (!continuationItems || continuationItems.length === 0) {
        return null;
    }
    const lastItem = continuationItems[continuationItems.length - 1];
    return lastItem?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token || null;
};

type ContinuationItem = {
    commentThreadRenderer?: {
        replies?: {
            commentRepliesRenderer?: {
                contents?: Array<{
                    continuationItemRenderer?: {
                        continuationEndpoint?: {
                            continuationCommand?: {
                                token?: string;
                            };
                        };
                    };
                }>;
            };
        };
    };
    continuationItemRenderer?: {
        button?: {
            buttonRenderer?: {
                command?: {
                    continuationCommand?: {
                        token?: string;
                    };
                };
            };
        };
    };
};

// Helper function to extract reply continuation tokens
const extractReplyContinuationTokens = (continuationItems: ContinuationItem[]): string[] => {
    const tokens: string[] = [];
    for (let index = 0; index < continuationItems.length; index++) {
        const continuationItem = continuationItems[index];
        const token = continuationItem.commentThreadRenderer?.replies?.commentRepliesRenderer?.contents?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token ||
            continuationItem?.continuationItemRenderer?.button?.buttonRenderer?.command?.continuationCommand?.token;
        if (token) {
            tokens.push(token);
        }
    }
    return tokens;
};

// Updated fetchRepliesJsonDataFromRemote function
const fetchRepliesJsonDataFromRemote = async (rawJsonData: any, windowObj: any, signal: AbortSignal): Promise<any[]> => {
    let replies: any[] = [];

    const fetchRepliesRecursively = async (tokens: string[]) => {
        for (const token of tokens) {
            const replyData = await fetchCommentJsonDataFromRemote(token, windowObj, signal);

            if (Array.isArray(replyData)) {
                replies = [...replies, ...replyData];
            } else {
                replies.push(replyData);
            }

            const continuationItems = replyData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems
                || replyData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || [];

            const newTokens = extractReplyContinuationTokens(continuationItems);
            if (newTokens.length > 0) {
                await fetchRepliesRecursively(newTokens);
            }
        }
    };

    const continuationItems = rawJsonData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems
        || rawJsonData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || [];

    const initialTokens = extractReplyContinuationTokens(continuationItems);
    if (initialTokens.length > 0) {
        await fetchRepliesRecursively(initialTokens);
    }

    return replies;
};

let currentAbortController = new AbortController();

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

        const videoId = extractYouTubeVideoIdFromUrl();
        if (!videoId) {
            throw new Error('Video ID not found');
        }

        const LOCAL_STORAGE_KEY = CACHE_KEYS.FINAL(videoId);
        const TEMP_CACHE_KEY = CACHE_KEYS.TEMP(videoId);
        const CONTINUATION_TOKEN_KEY = CACHE_KEYS.CONTINUATION_TOKEN(videoId);
        const cachedData = await getCachedDataIfValid(LOCAL_STORAGE_KEY);

        if (!bypassCache && cachedData) {
            onCommentsFetched(cachedData?.items || cachedData);
            return;
        }

        let allComments: CommentData[] = [];
        let processedData: { items: any[] } = { items: [] };
        const windowObj = window as any; // Cast window to any to use in YouTube logic
        let token: string | null = continuationToken || null;
        let totalComments: CommentData[] = [];
        const batchSize = 500;
        const updateThreshold = 2500;
        let accumulatedComments: any[] = [];
        let totalFetched = 0;

        do {
            allComments = [];
            processedData = { items: [] };

            const rawJsonData: CommentData = await fetchCommentJsonDataFromRemote(token, windowObj, signal);
            allComments.push(rawJsonData);

            const replyRawJsonData = await fetchRepliesJsonDataFromRemote(rawJsonData, windowObj, signal);
            allComments.push(...replyRawJsonData);

            processedData = processRawJsonCommentsData(allComments);
            accumulatedComments.push(...processedData.items);

            if ((totalFetched >= updateThreshold && accumulatedComments.length >= batchSize) || (totalFetched <= updateThreshold)) {
                totalComments = [...totalComments, ...accumulatedComments];
                onCommentsFetched(totalComments);
                accumulatedComments = [];
            }

            totalFetched = totalComments.length;
            const continuationItems = rawJsonData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems
                || rawJsonData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || [];
            token = extractContinuationToken(continuationItems);
        } while (token);

        if (totalComments.length > 0) {
            onCommentsFetched(totalComments);
            // await storeDataInDB(LOCAL_STORAGE_KEY, totalComments, true);

            // Clear temporary cache and continuation token
            await removeDataFromDB(TEMP_CACHE_KEY);
            localStorage.removeItem(CONTINUATION_TOKEN_KEY);
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.log('Fetch operation was aborted.');
        } else {
            console.error('Error fetching comments from remote:', error);
        }
    }
};
