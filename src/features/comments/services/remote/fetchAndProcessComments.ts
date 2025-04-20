// src/features/comments/services/remote/fetchAndProcessComments.ts
import { fetchCommentJsonDataFromRemote } from "./fetchCommentJsonDataFromRemote";
import { fetchRepliesJsonDataFromRemote } from "./fetchReplies";
import { processRawJsonCommentsData } from "../../utils/comments/retrieveYouTubeCommentPaths";
import { extractContinuationToken } from "./continuationTokenUtils";
import { db } from "../../../shared/utils/database/database";
import { Comment } from "../../../../types/commentTypes";
import { addDisplayedComments } from "../../../../store/store";

export interface FetchAndProcessResult {
    processedData: {
        items: Comment[];
    };
    token: string | null;
    hasQueuedReplies: boolean;
}

let activeReplyTasks = 0;

export const hasActiveReplyProcessing = (): boolean => {
    return activeReplyTasks > 0;
};

export const fetchAndProcessComments = async (token: string | null, videoId: string, windowObj: any, signal: AbortSignal, dispatch: any): Promise<FetchAndProcessResult> => {
    const rawJsonData = await fetchCommentJsonDataFromRemote(token, windowObj, signal);

    const continuationToken = extractContinuationToken(
        rawJsonData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems ||
        rawJsonData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems || []
    );

    const mainProcessedData = processRawJsonCommentsData([rawJsonData], videoId);

    const commentsToStore = mainProcessedData.items.map(comment => {
        if (comment.replyLevel === 0) {
            return {
                ...comment,
                tags: comment.tags ? [...comment.tags, 'parent'] : ['parent']
            };
        }

        return {
            ...comment,
            tags: comment.tags ? [...comment.tags, 'reply'] : ['reply']
        };
    });

    await db.comments.bulkPut(commentsToStore);

    if (!token) {
        const initialParentComments = commentsToStore
            .filter(comment => comment.replyLevel === 0)
            .slice(0, 10);

        const parentIds = initialParentComments.map(comment => comment.commentId);
        const initialReplies = commentsToStore.filter(
            comment => comment.commentParentId && parentIds.includes(comment.commentParentId)
        );

        dispatch(addDisplayedComments([...initialParentComments, ...initialReplies]));
    }

    const hasQueuedReplies = await queueReplyProcessing(rawJsonData, windowObj, signal, videoId, dispatch);

    return {
        processedData: mainProcessedData,
        token: continuationToken,
        hasQueuedReplies
    };
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
    try {
        const replies = await fetchRepliesJsonDataFromRemote(rawJsonData, windowObj, signal);

        if (replies && replies.length > 0) {
            const BATCH_SIZE = 50;

            for (let i = 0; i < replies.length; i += BATCH_SIZE) {
                const batch = replies.slice(i, i + BATCH_SIZE);

                const batchProcessedData = processRawJsonCommentsData(batch, videoId);

                if (batchProcessedData.items.length > 0) {
                    const repliesWithTags = batchProcessedData.items.map(reply => ({
                        ...reply,
                        tags: reply.tags ? [...reply.tags, 'reply'] : ['reply']
                    }));

                    await db.comments.bulkPut(repliesWithTags);

                    await new Promise(resolve => setTimeout(resolve, 10));
                }

                if (signal.aborted) break;
            }
        }
    } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
            console.error('Error processing replies:', error);
        }
    }
}