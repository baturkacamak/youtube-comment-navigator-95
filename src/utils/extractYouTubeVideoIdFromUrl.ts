// src/utils/extractYouTubeVideoIdFromUrl.ts
export const extractYouTubeVideoIdFromUrl = (url?: string): string => {
    const urlToUse = url || window.location.href;
    const urlObj = new URL(urlToUse);
    return urlObj.searchParams.get('v') || '';
};