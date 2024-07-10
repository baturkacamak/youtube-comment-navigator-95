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
            continuationItem?.continuationItemRenderer?.button?.buttonRenderer?.command?.continuationCommand?.token;
        if (token) {
            tokens.push(token);
        }
    }
    return tokens;
};
