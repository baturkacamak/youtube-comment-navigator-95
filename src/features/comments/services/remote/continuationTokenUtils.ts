export const extractContinuationToken = (continuationItems: any[]): string | null => {
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
                continuations?: Array<{
                    nextContinuationData?: {
                        continuation?: string;
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
export const extractReplyContinuationTokens = (continuationItems: ContinuationItem[]): string[] => {
    const tokens: string[] = [];
    for (let index = 0; index < continuationItems.length; index++) {
        const continuationItem = continuationItems[index];
        const token = continuationItem.commentThreadRenderer?.replies?.commentRepliesRenderer?.contents?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token ||
            continuationItem.commentThreadRenderer?.replies?.commentRepliesRenderer?.continuations?.[0]?.nextContinuationData?.continuation ||
            continuationItem?.continuationItemRenderer?.button?.buttonRenderer?.command?.continuationCommand?.token;
        if (token) {
            tokens.push(token);
        }
    }
    return tokens;
};

// Extended type for continuation items with comment ID access
type ExtendedContinuationItem = {
    commentThreadRenderer?: {
        commentViewModel?: {
            commentViewModel?: {
                commentId?: string;
            };
        };
        comment?: {
            commentRenderer?: {
                commentId?: string;
            };
        };
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
                continuations?: Array<{
                    nextContinuationData?: {
                        continuation?: string;
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

// Interface for reply task data
export interface ReplyTaskData {
    parentCommentId: string;
    continuationToken: string;
}

/**
 * Extract reply continuation tokens along with their parent comment IDs
 * Used for queueing reply fetch tasks to the background worker
 */
export const extractReplyTasksFromRawData = (rawJsonData: any): ReplyTaskData[] => {
    const tasks: ReplyTaskData[] = [];

    const continuationItems: ExtendedContinuationItem[] =
        rawJsonData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems ||
        rawJsonData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems ||
        [];

    for (const item of continuationItems) {
        // Extract parent comment ID
        const commentId =
            item.commentThreadRenderer?.commentViewModel?.commentViewModel?.commentId ||
            item.commentThreadRenderer?.comment?.commentRenderer?.commentId;

        if (!commentId) continue;

        // Extract reply continuation token
        const token =
            item.commentThreadRenderer?.replies?.commentRepliesRenderer?.contents?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token ||
            item.commentThreadRenderer?.replies?.commentRepliesRenderer?.continuations?.[0]?.nextContinuationData?.continuation;

        if (token) {
            tasks.push({
                parentCommentId: commentId,
                continuationToken: token
            });
        }
    }

    return tasks;
};
