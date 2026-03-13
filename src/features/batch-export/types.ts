import { Comment } from '../../types/commentTypes';
import { TranscriptEntry } from '../transcripts/utils/processTranscriptData';

export interface PlaylistVideoItem {
  videoId: string;
  title: string;
  index: number;
}

export type CommentsExportFormat = 'json' | 'csv';
export type TranscriptExportFormat = 'txt' | 'json' | 'srt';
export type DescriptionExportFormat = 'txt' | 'json';

export interface BatchExportFormatSelection {
  comments: CommentsExportFormat;
  transcript: TranscriptExportFormat;
  description: DescriptionExportFormat;
}

export interface BatchExportContentSelection {
  comments: boolean;
  transcript: boolean;
  description: boolean;
}

export interface VideoExportPayload {
  comments?: Comment[];
  transcript?: TranscriptEntry[];
  description?: {
    text: string;
    title: string;
    channel: string;
    publishedAt: string;
    videoId: string;
  };
}

export interface VideoExportResult {
  videoId: string;
  title: string;
  index: number;
  status: 'success' | 'partial' | 'failed';
  error?: string;
  warnings: string[];
  includedFiles: string[];
}

export interface BatchExportManifest {
  generatedAt: string;
  playlistId: string;
  totalRequestedVideos: number;
  selectedContent: BatchExportContentSelection;
  selectedFormats: BatchExportFormatSelection;
  results: VideoExportResult[];
}

export interface BatchExportProgress {
  totalVideos: number;
  completedVideos: number;
  currentVideoId: string;
  currentVideoTitle: string;
  stage: string;
}

export interface BatchExportParams {
  playlistId: string;
  selectedVideos: PlaylistVideoItem[];
  selectedContent: BatchExportContentSelection;
  selectedFormats: BatchExportFormatSelection;
  onProgress?: (progress: BatchExportProgress) => void;
  signal?: AbortSignal;
}

export interface BatchExportOutcome {
  fileName: string;
  manifest: BatchExportManifest;
}
