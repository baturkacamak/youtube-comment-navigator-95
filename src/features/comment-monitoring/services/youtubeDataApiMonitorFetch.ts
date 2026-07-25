import type { BackgroundCommentFetchResult, VideoCommentMonitorMetadata } from '../types';
import {
  parseTopLevelCommentsFromThreadsResponse,
  requestYouTubeDataApi,
  type DataApiCommentThreadsResponse,
} from '../../shared/services/youtubeDataApi';

interface VideoListResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      publishedAt?: string;
    };
    statistics?: {
      commentCount?: string;
    };
  }>;
}

export const parseNewestCommentThreadsResponse = (
  response: DataApiCommentThreadsResponse,
  videoId: string
) =>
  parseTopLevelCommentsFromThreadsResponse(response, videoId).sort(
    (left, right) => right.publishedDate - left.publishedDate
  );

const requestNewestCommentsPage = async (
  videoId: string,
  key: string,
  signal?: AbortSignal
): Promise<DataApiCommentThreadsResponse> => {
  return (await requestYouTubeDataApi(
    `/commentThreads?part=snippet&videoId=${encodeURIComponent(videoId)}&maxResults=100&order=time&textFormat=plainText`,
    key,
    signal
  )) as DataApiCommentThreadsResponse;
};

export const fetchVideoCommentMonitorMetadata = async (
  videoId: string,
  key: string,
  signal?: AbortSignal
): Promise<VideoCommentMonitorMetadata> => {
  const response = (await requestYouTubeDataApi(
    `/videos?part=snippet,statistics&id=${encodeURIComponent(videoId)}`,
    key,
    signal
  )) as VideoListResponse;
  const video = response.items?.[0];
  const parsedCommentCount = Number(video?.statistics?.commentCount);

  return {
    title: video?.snippet?.title || null,
    publishedAt: video?.snippet?.publishedAt || null,
    totalCommentCount: Number.isFinite(parsedCommentCount) ? parsedCommentCount : null,
  };
};

export const fetchVideosCommentMonitorMetadata = async (
  videoIds: string[],
  key: string,
  signal?: AbortSignal
): Promise<Record<string, VideoCommentMonitorMetadata>> => {
  if (videoIds.length === 0) {
    return {};
  }

  const response = (await requestYouTubeDataApi(
    `/videos?part=snippet,statistics&id=${videoIds.map(encodeURIComponent).join(',')}`,
    key,
    signal
  )) as VideoListResponse;
  const metadataByVideoId: Record<string, VideoCommentMonitorMetadata> = {};

  for (const video of response.items || []) {
    if (!video.id) {
      continue;
    }

    const parsedCommentCount = Number(video.statistics?.commentCount);
    metadataByVideoId[video.id] = {
      title: video.snippet?.title || null,
      publishedAt: video.snippet?.publishedAt || null,
      totalCommentCount: Number.isFinite(parsedCommentCount) ? parsedCommentCount : null,
    };
  }

  return metadataByVideoId;
};

export const fetchLatestCommentsViaDataApi = async (
  videoId: string,
  key: string,
  signal?: AbortSignal,
  metadata?: VideoCommentMonitorMetadata
): Promise<BackgroundCommentFetchResult> => {
  const [resolvedMetadata, response] = await Promise.all([
    metadata ? Promise.resolve(metadata) : fetchVideoCommentMonitorMetadata(videoId, key, signal),
    requestNewestCommentsPage(videoId, key, signal),
  ]);

  return {
    comments: parseNewestCommentThreadsResponse(response, videoId),
    title: resolvedMetadata.title,
    publishedAt: resolvedMetadata.publishedAt,
    totalCommentCount: resolvedMetadata.totalCommentCount,
  };
};
