import { fetchCommentJsonDataFromRemote } from "./fetchCommentJsonDataFromRemote";
import { fetchRepliesJsonDataFromRemote } from "./fetchReplies";
import { processRawJsonCommentsData } from "../../utils/comments/retrieveYouTubeCommentPaths";
import { extractContinuationToken } from "./continuationTokenUtils";
import { db } from "../../../shared/utils/database/database";
import { addProcessedReplies, setTotalCommentsCount } from "../../../../store/store";
import logger from "../../../shared/utils/logger";

export interface FetchAndProcessResult {
    processedData: {
        items: any[];
    };
    token: string | null;
    hasQueuedReplies: boolean;
}

let activeReplyTasks = 0;
let localCommentCount = 0;

export const hasActiveReplyProcessing = (): boolean => {
    return activeReplyTasks > 0;
};

export const resetLocalCommentCount = () => {
    localCommentCount = 0;
};

export const fetchAndProcessComments = async (token: string | null, videoId: string, windowObj: any, signal: AbortSignal, dispatch: any): Promise<FetchAndProcessResult> => {
    logger.start("fetchAndProcessComments");
    try {
        const rawJsonData = await fetchCommentJsonDataFromRemote(token, windowObj, signal);

        const continuationToken = extractContinuationToken(
            rawJsonData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems ||
            rawJsonData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || []
        );

        const mainProcessedData = processRawJsonCommentsData([rawJsonData], videoId);

        try {
            await db.comments.bulkPut(mainProcessedData.items);
            // Update local count and Redux store
            localCommentCount += mainProcessedData.items.length;
            dispatch(setTotalCommentsCount(localCommentCount));
            logger.success(`Inserted ${mainProcessedData.items.length} main comments into IndexedDB. Total count: ${localCommentCount}`);
        } catch (err) {
            logger.error("Failed to save main comments:", err);
        }

        const hasQueuedReplies = await queueReplyProcessing(rawJsonData, windowObj, signal, videoId, dispatch);

        logger.end("fetchAndProcessComments");
        return {
            processedData: mainProcessedData,
            token: continuationToken,
            hasQueuedReplies
        };
    } catch (err) {
        logger.error("Failed to fetch and process comments:", err);
        logger.end("fetchAndProcessComments");
        return {
            processedData: { items: [] },
            token: null,
            hasQueuedReplies: false
        };
    }
};

async function queueReplyProcessing(rawJsonData: any, windowObj: any, signal: AbortSignal, videoId: string, dispatch: any): Promise<boolean> {
    if (!rawJsonData || signal.aborted) {
        return false;
    }

    activeReplyTasks++;
    fetchRepliesAndProcess(rawJsonData, windowObj, signal, videoId, dispatch).finally(() => {
        activeReplyTasks--;
    });

    return true;
}

async function fetchRepliesAndProcess(rawJsonData: any, windowObj: any, signal: AbortSignal, videoId: string, dispatch: any): Promise<void> {
    logger.start("fetchRepliesAndProcess");
    try {
        const replies = await fetchRepliesJsonDataFromRemote(rawJsonData, windowObj, signal);

        if (replies && replies.length > 0) {
            const BATCH_SIZE = 20;
            logger.info(`Processing ${replies.length} replies.`);

            for (let i = 0; i < replies.length; i += BATCH_SIZE) {
                const batch = replies.slice(i, i + BATCH_SIZE);
                const batchProcessedData = processRawJsonCommentsData(batch, videoId);

                if (batchProcessedData.items.length > 0) {
                    try {
                        await db.comments.bulkPut(batchProcessedData.items);
                        // Update local count and Redux store for replies
                        localCommentCount += batchProcessedData.items.length;
                        dispatch(setTotalCommentsCount(localCommentCount));
                        logger.success(`Saved batch of ${batchProcessedData.items.length} replies to IndexedDB. Total count: ${localCommentCount}`);
                    } catch (e) {
                        logger.error("Failed to save replies batch:", e);
                    }

                    await new Promise(resolve => setTimeout(resolve, 10));
                }

                if (signal.aborted) {
                    logger.warn("Reply processing aborted midway.");
                    break;
                }
            }
        } else {
            logger.info("No replies to process.");
        }
    } catch (error) {
        if (!(error instanceof Error && error.name === 'AbortError')) {
            logger.error("Error processing replies:", error);
        } else {
            logger.warn("Reply processing was aborted.");
        }
    } finally {
        logger.end("fetchRepliesAndProcess");
    }
}
