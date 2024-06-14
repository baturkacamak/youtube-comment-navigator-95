// src/utils/environmentVariables.ts
export const isLocalEnvironment = (): boolean => {
    return process.env.NODE_ENV === 'development';
};

export const CACHE_KEYS = {
    FINAL: (videoId: string) => `cachedComments_${videoId}`,
    TEMP: (videoId: string) => `tempCachedComments_${videoId}`,
    CONTINUATION_TOKEN: (videoId: string) => `continuationToken_${videoId}`
};

export const supportedLanguages = [
    'ar', 'bn', 'cs', 'da', 'de', 'el', 'en', 'es', 'fa', 'fi', 'fr', 'he', 'hi', 'hu',
    'id', 'it', 'ja', 'jv', 'ko', 'mr', 'ms', 'nl', 'no', 'pa', 'pl', 'pt', 'ro', 'ru',
    'sk', 'sr', 'sv', 'ta', 'te', 'th', 'tl', 'tr', 'uk', 'ur', 'vi', 'zh', 'krt'
];
