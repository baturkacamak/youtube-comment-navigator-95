import React, { useMemo, useRef, useState } from 'react';
import {
  ChevronDownIcon,
  DocumentArrowDownIcon,
  StopCircleIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import Collapsible from '../../shared/components/Collapsible';
import { useToast } from '../../shared/contexts/ToastContext';
import { exportPlaylistBatchAsZip } from '../services/batchExportService';
import {
  getCurrentPlaylistId,
  getPlaylistVideos,
  isPlaylistWatchPage,
} from '../services/playlistService';
import {
  BatchExportContentSelection,
  BatchExportFormatSelection,
  BatchExportProgress,
  PlaylistVideoItem,
} from '../types';

const defaultContent: BatchExportContentSelection = {
  comments: true,
  transcript: true,
  description: true,
};

const defaultFormats: BatchExportFormatSelection = {
  comments: 'json',
  transcript: 'txt',
  description: 'txt',
};

const BatchExportAccordion: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [videos, setVideos] = useState<PlaylistVideoItem[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set<string>());
  const [selectedContent, setSelectedContent] =
    useState<BatchExportContentSelection>(defaultContent);
  const [selectedFormats, setSelectedFormats] =
    useState<BatchExportFormatSelection>(defaultFormats);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<BatchExportProgress | null>(null);

  const playlistId = getCurrentPlaylistId();
  const isPlaylist = isPlaylistWatchPage() && !!playlistId;

  const selectedVideos = useMemo(() => {
    return videos.filter((video) => selectedIds.has(video.videoId));
  }, [videos, selectedIds]);

  const hasSelectedContent =
    selectedContent.comments || selectedContent.transcript || selectedContent.description;
  const isAllSelected = videos.length > 0 && selectedIds.size === videos.length;

  const loadVideos = () => {
    setIsLoadingVideos(true);
    const list = getPlaylistVideos();
    setVideos(list);
    setSelectedIds(new Set(list.map((video) => video.videoId)));
    setIsLoadingVideos(false);
  };

  const toggleOpen = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    if (next && videos.length === 0) {
      loadVideos();
    }
  };

  const toggleVideo = (videoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(videos.map((video) => video.videoId)));
  };

  const updateContentSelection = (key: keyof BatchExportContentSelection, value: boolean) => {
    setSelectedContent((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const handleExport = async () => {
    if (selectedVideos.length === 0) {
      showToast({
        type: 'error',
        message: t('Select at least one video'),
        duration: 4000,
      });
      return;
    }

    if (!hasSelectedContent) {
      showToast({
        type: 'error',
        message: t('Select at least one content type'),
        duration: 4000,
      });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsExporting(true);
    setProgress({
      totalVideos: selectedVideos.length,
      completedVideos: 0,
      currentVideoId: '',
      currentVideoTitle: '',
      stage: 'Starting',
    });

    try {
      const outcome = await exportPlaylistBatchAsZip({
        playlistId,
        selectedVideos,
        selectedContent,
        selectedFormats,
        signal: controller.signal,
        onProgress: (nextProgress) => setProgress(nextProgress),
      });

      const succeeded = outcome.manifest.results.filter((item) => item.status === 'success').length;
      const partial = outcome.manifest.results.filter((item) => item.status === 'partial').length;
      const failed = outcome.manifest.results.filter((item) => item.status === 'failed').length;

      showToast({
        type: 'success',
        message: t('Exported ZIP ({{success}} success, {{partial}} partial, {{failed}} failed)', {
          success: succeeded,
          partial,
          failed,
        }),
        duration: 5000,
      });
      setIsExpanded(false);
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        showToast({
          type: 'info',
          message: t('Batch export canceled'),
          duration: 3000,
        });
      } else {
        showToast({
          type: 'error',
          message: error instanceof Error ? error.message : t('Batch export failed'),
          duration: 5000,
        });
      }
    } finally {
      abortRef.current = null;
      setIsExporting(false);
    }
  };

  if (!isPlaylist) {
    return null;
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        onClick={toggleOpen}
        className="inline-flex items-center rounded-md border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300"
        aria-expanded={isExpanded}
        aria-controls="batch-export-panel"
      >
        <DocumentArrowDownIcon className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
        <span className="text-xs cq-[42rem]:text-sm">{t('Batch Export')}</span>
        <ChevronDownIcon
          className={`w-3.5 h-3.5 ml-1 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <Collapsible
        id="batch-export-panel"
        isOpen={isExpanded}
        className="absolute end-0 start-auto top-full mt-2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-[min(22rem,calc(100cqi-0.5rem))] max-w-[min(92vw,22rem)] cq-[42rem]:w-[24rem] cq-[42rem]:max-w-[24rem]"
        style={{
          visibility: isExpanded ? 'visible' : 'hidden',
        }}
      >
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t('Playlist videos ({{count}})', { count: videos.length })}
            </p>
            <button
              type="button"
              onClick={toggleSelectAll}
              disabled={isLoadingVideos || isExporting || videos.length === 0}
              className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {isAllSelected ? t('Unselect all') : t('Select all')}
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2 space-y-1">
            {isLoadingVideos && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('Loading playlist videos...')}
              </p>
            )}
            {!isLoadingVideos && videos.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('No playlist videos found on this page.')}
              </p>
            )}
            {!isLoadingVideos &&
              videos.map((video) => (
                <label
                  key={video.videoId}
                  className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer py-1"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(video.videoId)}
                    onChange={() => toggleVideo(video.videoId)}
                    disabled={isExporting}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300"
                  />
                  <span className="line-clamp-2">{`${video.index}. ${video.title}`}</span>
                </label>
              ))}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t('Content & formats')}
            </p>

            <div className="grid grid-cols-[auto,1fr] items-center gap-2">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={selectedContent.comments}
                  onChange={(event) => updateContentSelection('comments', event.target.checked)}
                  disabled={isExporting}
                />
                {t('Comments')}
              </label>
              <select
                value={selectedFormats.comments}
                onChange={(event) =>
                  setSelectedFormats((prev) => ({
                    ...prev,
                    comments: event.target.value as 'json' | 'csv',
                  }))
                }
                disabled={!selectedContent.comments || isExporting}
                className="text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-gray-700 dark:text-gray-200"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>

              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={selectedContent.transcript}
                  onChange={(event) => updateContentSelection('transcript', event.target.checked)}
                  disabled={isExporting}
                />
                {t('Transcript')}
              </label>
              <select
                value={selectedFormats.transcript}
                onChange={(event) =>
                  setSelectedFormats((prev) => ({
                    ...prev,
                    transcript: event.target.value as 'txt' | 'json' | 'srt',
                  }))
                }
                disabled={!selectedContent.transcript || isExporting}
                className="text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-gray-700 dark:text-gray-200"
              >
                <option value="txt">TXT</option>
                <option value="srt">SRT</option>
                <option value="json">JSON</option>
              </select>

              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={selectedContent.description}
                  onChange={(event) => updateContentSelection('description', event.target.checked)}
                  disabled={isExporting}
                />
                {t('Description')}
              </label>
              <select
                value={selectedFormats.description}
                onChange={(event) =>
                  setSelectedFormats((prev) => ({
                    ...prev,
                    description: event.target.value as 'txt' | 'json',
                  }))
                }
                disabled={!selectedContent.description || isExporting}
                className="text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-gray-700 dark:text-gray-200"
              >
                <option value="txt">TXT</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </div>

          {progress && (
            <div className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 rounded p-2">
              <p>
                {t('Progress: {{completed}}/{{total}}', {
                  completed: progress.completedVideos,
                  total: progress.totalVideos,
                })}
              </p>
              {progress.currentVideoTitle && (
                <p className="truncate">{progress.currentVideoTitle}</p>
              )}
              <p>{progress.stage}</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={isExporting || selectedVideos.length === 0 || !hasSelectedContent}
              className={`flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200 ${
                isExporting || selectedVideos.length === 0 || !hasSelectedContent
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-2" aria-hidden="true" />
              <span className="text-sm font-medium">
                {isExporting
                  ? t('Exporting...')
                  : t('Export {{count}} Videos', { count: selectedVideos.length })}
              </span>
            </button>

            {isExporting && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-2 border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors duration-200"
              >
                <StopCircleIcon className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </Collapsible>
    </div>
  );
};

export default BatchExportAccordion;
