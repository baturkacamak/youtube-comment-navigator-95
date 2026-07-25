import type { Comment } from '../../../types/commentTypes';

const YOUTUBE_DATA_API_URL = 'https://www.googleapis.com/youtube/v3';
export const YOUTUBE_DATA_API_KEY_STORAGE = 'youtubeDataApiKey';

type DataApiSnippet = {
  authorDisplayName?: string;
  authorProfileImageUrl?: string;
  authorChannelId?: { value?: string };
  likeCount?: number;
  publishedAt?: string;
  textDisplay?: string;
  textOriginal?: string;
};

export type DataApiComment = {
  id?: string;
  snippet?: DataApiSnippet;
};

export type DataApiCommentThread = {
  id?: string;
  snippet?: {
    topLevelComment?: DataApiComment;
    totalReplyCount?: number;
    videoId?: string;
  };
  replies?: {
    comments?: DataApiComment[];
  };
};

export type DataApiCommentThreadsResponse = {
  items?: DataApiCommentThread[];
  nextPageToken?: string;
};

export const mapDataApiComment = (
  snippet: DataApiSnippet & { id?: string },
  videoId: string,
  parentId?: string,
  replyCount: number = 0
): Comment => {
  const publishedDate = Date.parse(snippet.publishedAt || '') || Date.now();
  const content = snippet.textDisplay || snippet.textOriginal || '';

  return {
    author: snippet.authorDisplayName || '',
    likes: Number(snippet.likeCount || 0),
    viewLikes: '',
    content,
    published: snippet.publishedAt || '',
    publishedDate,
    authorAvatarUrl: snippet.authorProfileImageUrl || '',
    isAuthorContentCreator: false,
    authorChannelId: snippet.authorChannelId?.value || '',
    replyCount,
    commentId: snippet.id || '',
    commentParentId: parentId || '',
    replyLevel: parentId ? 1 : 0,
    hasTimestamp: /\b\d{1,2}:\d{2}\b/.test(content),
    hasLinks: /https?:\/\//i.test(content),
    videoId,
    wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
    timestamp: Date.now(),
    source: 'dataApi',
  };
};

export const readYouTubeDataApiKeyFromStorage = async (
  storage: Pick<typeof chrome.storage.local, 'get'>
): Promise<string | null> => {
  const result = await storage.get(YOUTUBE_DATA_API_KEY_STORAGE);
  const key = result[YOUTUBE_DATA_API_KEY_STORAGE];
  return typeof key === 'string' && key.trim() ? key.trim() : null;
};

export const requestYouTubeDataApi = async (
  path: string,
  key: string,
  signal?: AbortSignal
): Promise<unknown> => {
  const response = await fetch(
    `${YOUTUBE_DATA_API_URL}${path}${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}`,
    { signal, cache: 'no-store' }
  );
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw Object.assign(new Error(body?.error?.message || `HTTP ${response.status}`), {
      status: response.status,
      reason: body?.error?.errors?.[0]?.reason,
    });
  }

  return body;
};

const toTopLevelComment = (
  thread: DataApiCommentThread,
  fallbackVideoId: string
): Comment | null => {
  const topLevelComment = thread.snippet?.topLevelComment;
  const snippet = topLevelComment?.snippet;
  if (!topLevelComment?.id || !snippet) {
    return null;
  }

  return mapDataApiComment(
    {
      ...snippet,
      id: topLevelComment.id,
    },
    thread.snippet?.videoId || fallbackVideoId,
    undefined,
    Number(thread.snippet?.totalReplyCount || 0)
  );
};

export const parseTopLevelCommentsFromThreadsResponse = (
  response: DataApiCommentThreadsResponse,
  videoId: string
): Comment[] => {
  const comments: Comment[] = [];
  for (const item of response.items || []) {
    const comment = toTopLevelComment(item, videoId);
    if (comment) {
      comments.push(comment);
    }
  }

  return comments;
};
