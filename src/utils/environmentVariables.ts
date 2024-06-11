// src/utils/environmentVariables.ts
export const isLocalEnvironment = (): boolean => {
    return process.env.NODE_ENV === 'development';
};

export const CACHE_KEYS = {
    FINAL: (videoId: string) => `cachedComments_${videoId}`,
    TEMP: (videoId: string) => `tempCachedComments_${videoId}`,
    CONTINUATION_TOKEN: (videoId: string) => `continuationToken_${videoId}`
};