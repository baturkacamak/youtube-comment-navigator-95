import { extractYouTubeVideoIdFromUrl } from '../../shared/utils/extractYouTubeVideoIdFromUrl';
import { PlaylistVideoItem } from '../types';

interface PlaylistPanelVideoRenderer {
  videoId?: string;
  title?: {
    simpleText?: string;
    runs?: Array<{ text?: string }>;
  };
  index?: {
    simpleText?: string;
  };
}

interface YtInitialPlaylistItem {
  playlistPanelVideoRenderer?: PlaylistPanelVideoRenderer;
}

interface YtInitialDataShape {
  contents?: {
    twoColumnWatchNextResults?: {
      playlist?: {
        playlist?: {
          contents?: YtInitialPlaylistItem[];
        };
        playlistPanelRenderer?: {
          contents?: YtInitialPlaylistItem[];
        };
      };
    };
  };
}

const safeText = (value: string | undefined): string => {
  return (value || '').trim();
};

const titleFromRuns = (runs: Array<{ text?: string }> | undefined): string => {
  if (!runs || runs.length === 0) {
    return '';
  }
  return runs.map((run) => run?.text || '').join('').trim();
};

const parseVideoIdFromHref = (href: string | null): string => {
  if (!href) return '';
  try {
    const url = new URL(href, window.location.origin);
    return url.searchParams.get('v') || '';
  } catch {
    return '';
  }
};

const fromYtInitialData = (): PlaylistVideoItem[] => {
  const data = (window as Window & { ytInitialData?: YtInitialDataShape }).ytInitialData;
  const rawItems =
    data?.contents?.twoColumnWatchNextResults?.playlist?.playlist?.contents ||
    data?.contents?.twoColumnWatchNextResults?.playlist?.playlistPanelRenderer?.contents ||
    [];

  const items: PlaylistVideoItem[] = [];
  rawItems.forEach((item, idx) => {
    const renderer = item?.playlistPanelVideoRenderer;
    if (!renderer) {
      return;
    }

    const videoId = renderer?.videoId || '';
    if (!videoId) {
      return;
    }

    const title =
      safeText(renderer?.title?.simpleText) ||
      safeText(titleFromRuns(renderer?.title?.runs)) ||
      `Video ${idx + 1}`;
    const parsedIndex = Number(renderer?.index?.simpleText);

    items.push({
      videoId,
      title,
      index: Number.isFinite(parsedIndex) && parsedIndex > 0 ? parsedIndex : idx + 1,
    });
  });

  return items;
};

const fromDom = (): PlaylistVideoItem[] => {
  const rows = Array.from(
    document.querySelectorAll('ytd-playlist-panel-video-renderer, ytd-playlist-video-renderer')
  );
  const items: PlaylistVideoItem[] = [];

  rows.forEach((row, idx) => {
    const titleNode =
      (row.querySelector('#video-title') as HTMLElement | null) ||
      (row.querySelector('span#video-title') as HTMLElement | null);
    const linkNode = row.querySelector('a[href*="watch"]') as HTMLAnchorElement | null;
    const indexNode =
      (row.querySelector('#index') as HTMLElement | null) ||
      (row.querySelector('yt-formatted-string#index') as HTMLElement | null);

    const videoId = parseVideoIdFromHref(linkNode?.getAttribute('href') || linkNode?.href || null);
    if (!videoId) {
      return;
    }

    const title = safeText(titleNode?.textContent || '') || `Video ${idx + 1}`;
    const parsedIndex = Number((indexNode?.textContent || '').trim());
    items.push({
      videoId,
      title,
      index: Number.isFinite(parsedIndex) && parsedIndex > 0 ? parsedIndex : idx + 1,
    });
  });

  return items;
};

const dedupeAndSort = (items: PlaylistVideoItem[]): PlaylistVideoItem[] => {
  const deduped = new Map<string, PlaylistVideoItem>();

  for (const item of items) {
    if (!item.videoId) {
      continue;
    }
    if (!deduped.has(item.videoId)) {
      deduped.set(item.videoId, item);
    }
  }

  const sorted = Array.from(deduped.values()).sort((a, b) => a.index - b.index);
  return sorted.map((item, idx) => ({
    ...item,
    index: idx + 1,
  }));
};

export const getCurrentPlaylistId = (): string => {
  return new URLSearchParams(window.location.search).get('list') || '';
};

const isWatchPath = (): boolean => {
  return window.location.pathname === '/watch';
};

const isPlaylistPath = (): boolean => {
  return window.location.pathname === '/playlist';
};

export const isPlaylistContextPage = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  return (
    (isWatchPath() && params.has('v') && params.has('list')) || (isPlaylistPath() && params.has('list'))
  );
};

// Backward-compatible name used by existing callers.
export const isPlaylistWatchPage = (): boolean => {
  return isPlaylistContextPage();
};

export const getPlaylistVideos = (): PlaylistVideoItem[] => {
  const combined = dedupeAndSort([...fromYtInitialData(), ...fromDom()]);
  if (combined.length > 0) {
    return combined;
  }

  const currentVideoId = extractYouTubeVideoIdFromUrl();
  if (!currentVideoId) {
    return [];
  }

  return [
    {
      videoId: currentVideoId,
      title: document.title?.replace(' - YouTube', '').trim() || 'Current Video',
      index: 1,
    },
  ];
};
