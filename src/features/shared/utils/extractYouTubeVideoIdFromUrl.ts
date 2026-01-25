// src/utils/extractYouTubeVideoIdFromUrl.ts
export const extractYouTubeVideoIdFromUrl = (url?: string): string => {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'mock-video-id';
    }
    const urlToUse = url || window.location.href;
    const urlObj = new URL(urlToUse);
    return urlObj.searchParams.get('v') || '';
};