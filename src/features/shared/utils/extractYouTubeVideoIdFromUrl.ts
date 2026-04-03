// src/utils/extractYouTubeVideoIdFromUrl.ts
export const extractYouTubeVideoIdFromUrl = (url?: string): string => {
  if (
    typeof url === 'undefined' &&
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return 'mock-video-id';
  }

  const urlToUse = typeof url === 'undefined' ? window.location.href : url;
  if (!urlToUse) {
    return '';
  }

  try {
    const urlObj = new URL(urlToUse);
    return urlObj.searchParams.get('v') || '';
  } catch {
    return '';
  }
};
