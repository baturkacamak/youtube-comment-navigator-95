import { Comment } from '../../../types/commentTypes';
import { fetchRepliesJsonDataFromRemote } from '../../comments/services/remote/fetchReplies';
import { extractContinuationToken } from '../../comments/services/remote/continuationTokenUtils';
import { fetchContinuationTokenFromRemote } from '../../comments/services/remote/fetchContinuationTokenFromRemote';
import { processRawJsonCommentsData } from '../../comments/utils/comments/retrieveYouTubeCommentPaths';
import { cleanCommentsForExport } from '../../shared/components/DownloadAccordion/cleanDataForExport';
import { youtubeApi } from '../../shared/services/youtubeApi';
import { formatTime } from '../../transcripts/utils/formatTime';
import { fetchTranscriptFromRemote } from '../../transcripts/services/remoteFetch';
import { convertToSrt } from '../../transcripts/utils/convertToSrt';
import {
  BatchExportManifest,
  BatchExportOutcome,
  BatchExportParams,
  PlaylistVideoItem,
  VideoExportPayload,
  VideoExportResult,
} from '../types';
import { createZipArchive, textToBytes } from '../utils/createZip';

interface ContinuationEndpointResponse {
  onResponseReceivedEndpoints?: Array<{
    appendContinuationItemsAction?: { continuationItems?: unknown[] };
    reloadContinuationItemsCommand?: { continuationItems?: unknown[] };
  }>;
}

interface PlayerResponseData {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: Array<{ baseUrl?: string }>;
    };
  };
  videoDetails?: {
    shortDescription?: string;
    title?: string;
    author?: string;
  };
  microformat?: {
    playerMicroformatRenderer?: {
      publishDate?: string;
    };
  };
}

const sanitizeFileNamePart = (value: string): string => {
  const cleaned = value
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned.slice(0, 80) || 'untitled';
};

const assertNotAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new DOMException('Batch export aborted', 'AbortError');
  }
};

const getContinuationItems = (response: ContinuationEndpointResponse): unknown[] => {
  return (
    response?.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems ||
    response?.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand?.continuationItems ||
    []
  );
};

const toCsv = (rows: unknown[]): string => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return '';
  }

  const allKeys = new Set<string>();
  rows.forEach((row) => {
    if (typeof row === 'object' && row !== null) {
      Object.keys(row).forEach((key) => allKeys.add(key));
    }
  });

  const headers = Array.from(allKeys);
  const headerRow = headers.join(',');

  const body = rows.map((row) => {
    if (typeof row !== 'object' || row === null) {
      return `"${String(row).replace(/"/g, '""')}"`;
    }

    const record = row as Record<string, unknown>;
    return headers
      .map((header) => {
        const value = record[header];
        if (value === null || value === undefined) {
          return '""';
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  return [headerRow, ...body].join('\n');
};

const formatComments = (comments: Comment[], format: 'json' | 'csv'): string => {
  const cleaned = cleanCommentsForExport(comments as unknown[]);
  if (format === 'csv') {
    return toCsv(cleaned);
  }
  return JSON.stringify(cleaned, null, 2);
};

const formatTranscript = (
  transcript: Array<{ start: number; duration: number; text: string }>,
  format: 'txt' | 'json' | 'srt'
): string => {
  if (format === 'json') {
    return JSON.stringify(transcript, null, 2);
  }
  if (format === 'srt') {
    return convertToSrt(transcript);
  }
  return transcript.map((entry) => `${formatTime(entry.start)} ${entry.text}`).join('\n');
};

const formatDescription = (
  description: {
    text: string;
    title: string;
    channel: string;
    publishedAt: string;
    videoId: string;
  },
  format: 'txt' | 'json'
): string => {
  if (format === 'json') {
    return JSON.stringify(description, null, 2);
  }

  return [
    `Title: ${description.title}`,
    `Channel: ${description.channel}`,
    `Published: ${description.publishedAt}`,
    `Video ID: ${description.videoId}`,
    '',
    description.text,
  ].join('\n');
};

const fetchAllCommentsForVideo = async (videoId: string, signal?: AbortSignal): Promise<Comment[]> => {
  assertNotAborted(signal);

  const firstToken = await fetchContinuationTokenFromRemote(videoId);
  if (!firstToken) {
    return [];
  }

  const comments = new Map<string, Comment>();
  const seenTokens = new Set<string>();
  let token: string | null = firstToken;
  const nonAbortSignal = new AbortController().signal;

  while (token) {
    assertNotAborted(signal);

    if (seenTokens.has(token)) {
      break;
    }
    seenTokens.add(token);

    const mainResponse = (await youtubeApi.fetchNext({
      continuationToken: token,
      signal,
    })) as ContinuationEndpointResponse;

    const replies = await fetchRepliesJsonDataFromRemote(
      mainResponse,
      window as unknown as object,
      signal || nonAbortSignal
    );
    const processed = processRawJsonCommentsData([mainResponse, ...replies], videoId).items as Comment[];

    processed.forEach((comment) => {
      if (comment?.commentId && !comments.has(comment.commentId)) {
        comments.set(comment.commentId, comment);
      }
    });

    token = extractContinuationToken(getContinuationItems(mainResponse));
  }

  return Array.from(comments.values());
};

const fetchTranscriptForVideo = async (
  playerData: PlayerResponseData | null,
  signal?: AbortSignal
): Promise<Array<{ start: number; duration: number; text: string }>> => {
  assertNotAborted(signal);

  const captionTracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  const firstTrack = captionTracks[0];
  if (!firstTrack?.baseUrl) {
    throw new Error('Transcript unavailable');
  }

  const transcript = await fetchTranscriptFromRemote(firstTrack.baseUrl);
  assertNotAborted(signal);
  return transcript.items;
};

const buildDescriptionPayload = (videoId: string, playerData: PlayerResponseData | null) => {
  const details = playerData?.videoDetails;
  if (!details) {
    throw new Error('Description unavailable');
  }

  return {
    text: details.shortDescription || '',
    title: details.title || '',
    channel: details.author || '',
    publishedAt: playerData?.microformat?.playerMicroformatRenderer?.publishDate || '',
    videoId,
  };
};

const resolveVideoTitle = (video: PlaylistVideoItem, playerData: PlayerResponseData | null): string => {
  const fromPlayer = playerData?.videoDetails?.title;
  return fromPlayer || video.title || `Video ${video.index}`;
};

const buildVideoFolder = (video: PlaylistVideoItem, resolvedTitle: string): string => {
  const order = String(video.index).padStart(3, '0');
  const safeTitle = sanitizeFileNamePart(resolvedTitle);
  return `${order}_${video.videoId}_${safeTitle}`;
};

const createZipFileName = (playlistId: string): string => {
  const safePlaylistId = sanitizeFileNamePart(playlistId || 'playlist');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `playlist_${safePlaylistId}_${stamp}.zip`;
};

const buildVideoPayload = async (
  video: PlaylistVideoItem,
  params: BatchExportParams
): Promise<{ result: VideoExportResult; payload: VideoExportPayload }> => {
  const { selectedContent, signal } = params;
  const warnings: string[] = [];
  const includedFiles: string[] = [];
  const payload: VideoExportPayload = {};

  let playerData: PlayerResponseData | null = null;
  const needsPlayerData = selectedContent.transcript || selectedContent.description;

  if (needsPlayerData) {
    try {
      playerData = await youtubeApi.fetchPlayer(video.videoId, signal);
    } catch {
      warnings.push('Failed to fetch video metadata');
    }
  }

  if (selectedContent.comments) {
    try {
      const comments = await fetchAllCommentsForVideo(video.videoId, signal);
      payload.comments = comments;
      includedFiles.push('comments');
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : 'Failed to fetch comments');
    }
  }

  if (selectedContent.transcript) {
    try {
      const transcript = await fetchTranscriptForVideo(playerData, signal);
      payload.transcript = transcript;
      includedFiles.push('transcript');
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : 'Failed to fetch transcript');
    }
  }

  if (selectedContent.description) {
    try {
      payload.description = buildDescriptionPayload(video.videoId, playerData);
      includedFiles.push('description');
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : 'Failed to fetch description');
    }
  }

  const status: VideoExportResult['status'] =
    includedFiles.length === 0 ? 'failed' : warnings.length > 0 ? 'partial' : 'success';

  return {
    result: {
      videoId: video.videoId,
      title: resolveVideoTitle(video, playerData),
      index: video.index,
      status,
      warnings,
      includedFiles,
      error: status === 'failed' ? 'No selected content could be exported' : undefined,
    },
    payload,
  };
};

export const exportPlaylistBatchAsZip = async (params: BatchExportParams): Promise<BatchExportOutcome> => {
  const { selectedVideos, selectedContent, selectedFormats, playlistId, onProgress, signal } = params;
  assertNotAborted(signal);

  if (selectedVideos.length === 0) {
    throw new Error('Select at least one video');
  }

  if (!selectedContent.comments && !selectedContent.transcript && !selectedContent.description) {
    throw new Error('Select at least one content type');
  }

  const manifest: BatchExportManifest = {
    generatedAt: new Date().toISOString(),
    playlistId,
    totalRequestedVideos: selectedVideos.length,
    selectedContent,
    selectedFormats,
    results: [],
  };

  const zipEntries: Array<{ path: string; data: Uint8Array }> = [];
  let completed = 0;

  for (const video of selectedVideos) {
    assertNotAborted(signal);

    onProgress?.({
      totalVideos: selectedVideos.length,
      completedVideos: completed,
      currentVideoId: video.videoId,
      currentVideoTitle: video.title,
      stage: 'Fetching data',
    });

    const { result, payload } = await buildVideoPayload(video, params);
    manifest.results.push(result);

    const folderName = buildVideoFolder(video, result.title);

    if (selectedContent.comments && payload.comments) {
      const extension = selectedFormats.comments;
      const content = formatComments(payload.comments, extension);
      zipEntries.push({
        path: `${folderName}/comments.${extension}`,
        data: textToBytes(content),
      });
    }

    if (selectedContent.transcript && payload.transcript) {
      const extension = selectedFormats.transcript;
      const content = formatTranscript(payload.transcript, extension);
      zipEntries.push({
        path: `${folderName}/transcript.${extension}`,
        data: textToBytes(content),
      });
    }

    if (selectedContent.description && payload.description) {
      const extension = selectedFormats.description;
      const content = formatDescription(payload.description, extension);
      zipEntries.push({
        path: `${folderName}/description.${extension}`,
        data: textToBytes(content),
      });
    }

    completed += 1;
    onProgress?.({
      totalVideos: selectedVideos.length,
      completedVideos: completed,
      currentVideoId: video.videoId,
      currentVideoTitle: video.title,
      stage: 'Completed video',
    });
  }

  zipEntries.push({
    path: 'manifest.json',
    data: textToBytes(JSON.stringify(manifest, null, 2)),
  });

  if (zipEntries.length <= 1) {
    throw new Error('No data was exported for selected videos');
  }

  const blob = createZipArchive(zipEntries);
  const fileName = createZipFileName(playlistId);
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  return {
    fileName,
    manifest,
  };
};
