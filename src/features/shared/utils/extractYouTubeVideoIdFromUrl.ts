// src/utils/extractYouTubeVideoIdFromUrl.ts

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

const isLocalHost = (hostname: string): boolean => LOCAL_HOSTS.has(hostname);

const sanitizeSegment = (segment: string | undefined): string => {
  if (!segment) return '';
  return segment.split(/[?&#]/)[0].trim();
};

export const extractYouTubeVideoIdFromUrl = (url?: string): string => {
  try {
    const base =
      typeof window !== 'undefined' ? window.location.href : 'https://www.youtube.com/watch?v=';
    const urlObj = new URL(url || base, base);

    if (isLocalHost(urlObj.hostname)) {
      return 'mock-video-id';
    }

    const queryVideoId = sanitizeSegment(urlObj.searchParams.get('v') || '');
    if (queryVideoId) {
      return queryVideoId;
    }

    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const first = pathParts[0];
    const second = sanitizeSegment(pathParts[1]);

    if (first === 'shorts' && second) {
      return second;
    }

    if (first === 'embed' && second) {
      return second;
    }

    if (urlObj.hostname === 'youtu.be') {
      return sanitizeSegment(pathParts[0]);
    }

    return '';
  } catch {
    return '';
  }
};
