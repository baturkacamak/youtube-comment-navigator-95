import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BatchExportAccordion from './BatchExportAccordion';
import { BatchExportOutcome, BatchExportParams, PlaylistVideoItem } from '../types';

const {
  mockShowToast,
  mockExportPlaylistBatchAsZip,
  mockGetCurrentPlaylistId,
  mockGetPlaylistVideos,
  mockIsPlaylistWatchPage,
} = vi.hoisted(() => ({
  mockShowToast: vi.fn(),
  mockExportPlaylistBatchAsZip: vi.fn(),
  mockGetCurrentPlaylistId: vi.fn(),
  mockGetPlaylistVideos: vi.fn(),
  mockIsPlaylistWatchPage: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (!options) return key;
      return Object.entries(options).reduce(
        (text, [placeholder, value]) => text.replace(`{{${placeholder}}}`, String(value)),
        key
      );
    },
  }),
}));

vi.mock('../../shared/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

vi.mock('../services/batchExportService', () => ({
  exportPlaylistBatchAsZip: mockExportPlaylistBatchAsZip,
}));

vi.mock('../services/playlistService', () => ({
  getCurrentPlaylistId: mockGetCurrentPlaylistId,
  getPlaylistVideos: mockGetPlaylistVideos,
  isPlaylistWatchPage: mockIsPlaylistWatchPage,
}));

vi.mock('../../shared/components/Collapsible', () => ({
  default: ({
    children,
    isOpen,
    id,
    className,
    style,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
    id?: string;
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <div
      data-testid="collapsible"
      data-is-open={isOpen}
      id={id}
      className={className}
      style={style}
    >
      {children}
    </div>
  ),
}));

const playlistVideos: PlaylistVideoItem[] = [
  { videoId: 'video-1', title: 'First Video', index: 1 },
  { videoId: 'video-2', title: 'Second Video', index: 2 },
  { videoId: 'video-3', title: 'Third Video', index: 3 },
];

const buildOutcome = (statuses: Array<'success' | 'partial' | 'failed'>): BatchExportOutcome => ({
  fileName: 'playlist_PL001_2026.zip',
  manifest: {
    generatedAt: '2026-02-07T00:00:00.000Z',
    playlistId: 'PL001',
    totalRequestedVideos: statuses.length,
    selectedContent: {
      comments: true,
      transcript: true,
      description: false,
    },
    selectedFormats: {
      comments: 'json',
      transcript: 'srt',
      description: 'txt',
    },
    results: statuses.map((status, index) => ({
      videoId: `video-${index + 1}`,
      title: `Video ${index + 1}`,
      index: index + 1,
      status,
      warnings: [],
      includedFiles: status === 'failed' ? [] : ['comments'],
      error: status === 'failed' ? 'No selected content could be exported' : undefined,
    })),
  },
});

describe('BatchExportAccordion Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPlaylistWatchPage.mockReturnValue(true);
    mockGetCurrentPlaylistId.mockReturnValue('PL001');
    mockGetPlaylistVideos.mockReturnValue(playlistVideos);
    mockExportPlaylistBatchAsZip.mockResolvedValue(buildOutcome(['success', 'partial', 'failed']));
  });

  it('does not render outside playlist context', () => {
    mockIsPlaylistWatchPage.mockReturnValue(false);

    const { container } = render(<BatchExportAccordion />);

    expect(container.firstChild).toBeNull();
  });

  it('loads and displays playlist videos when panel opens', async () => {
    render(<BatchExportAccordion />);

    fireEvent.click(screen.getByRole('button', { name: /Batch Export/i }));

    await waitFor(() => {
      expect(mockGetPlaylistVideos).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Playlist videos (3)')).toBeInTheDocument();
      expect(screen.getByText('1. First Video')).toBeInTheDocument();
      expect(screen.getByText('2. Second Video')).toBeInTheDocument();
    });
  });

  it('shows empty playlist state and keeps export disabled when no videos are found', async () => {
    mockGetPlaylistVideos.mockReturnValueOnce([]);

    render(<BatchExportAccordion />);
    fireEvent.click(screen.getByRole('button', { name: /Batch Export/i }));

    await waitFor(() => {
      expect(screen.getByText('No playlist videos found on this page.')).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: /Export 0 Videos/i });
    expect(exportButton).toBeDisabled();

    fireEvent.click(exportButton);
    expect(mockExportPlaylistBatchAsZip).not.toHaveBeenCalled();
  });

  it('supports select-all toggling and updates selected count', async () => {
    render(<BatchExportAccordion />);
    fireEvent.click(screen.getByRole('button', { name: /Batch Export/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Export 3 Videos/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Unselect all/i }));

    const zeroButton = screen.getByRole('button', { name: /Export 0 Videos/i });
    expect(zeroButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Select all/i }));
    expect(screen.getByRole('button', { name: /Export 3 Videos/i })).toBeEnabled();
  });

  it('disables export when all content types are unchecked', async () => {
    render(<BatchExportAccordion />);
    fireEvent.click(screen.getByRole('button', { name: /Batch Export/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Export 3 Videos/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('checkbox', { name: /Comments/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Transcript/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Description/i }));

    const exportButton = screen.getByRole('button', { name: /Export 3 Videos/i });
    expect(exportButton).toBeDisabled();

    fireEvent.click(exportButton);
    expect(mockExportPlaylistBatchAsZip).not.toHaveBeenCalled();
  });

  it('exports selected videos with selected content and formats', async () => {
    render(<BatchExportAccordion />);
    fireEvent.click(screen.getByRole('button', { name: /Batch Export/i }));

    await waitFor(() => {
      expect(screen.getByText('Export 3 Videos')).toBeInTheDocument();
    });

    // Deselect first video -> 2 selected
    fireEvent.click(screen.getByRole('checkbox', { name: /1\. First Video/i }));

    // Disable description and switch transcript format to SRT
    fireEvent.click(screen.getByRole('checkbox', { name: /Description/i }));
    const formatSelects = screen.getAllByRole('combobox');
    fireEvent.change(formatSelects[1], { target: { value: 'srt' } });

    fireEvent.click(screen.getByRole('button', { name: /Export 2 Videos/i }));

    await waitFor(() => {
      expect(mockExportPlaylistBatchAsZip).toHaveBeenCalledTimes(1);
    });

    const params = mockExportPlaylistBatchAsZip.mock.calls[0][0] as BatchExportParams;
    expect(params.playlistId).toBe('PL001');
    expect(params.selectedVideos.map((video) => video.videoId)).toEqual(['video-2', 'video-3']);
    expect(params.selectedContent).toEqual({
      comments: true,
      transcript: true,
      description: false,
    });
    expect(params.selectedFormats).toEqual({
      comments: 'json',
      transcript: 'srt',
      description: 'txt',
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        message: expect.stringContaining('Exported ZIP'),
      })
    );
  });

  it('cancels an in-progress export and shows info toast', async () => {
    mockExportPlaylistBatchAsZip.mockImplementation(
      ({ signal, onProgress }: BatchExportParams) =>
        new Promise<BatchExportOutcome>((resolve, reject) => {
          onProgress?.({
            totalVideos: 3,
            completedVideos: 1,
            currentVideoId: 'video-1',
            currentVideoTitle: 'First Video',
            stage: 'Fetching data',
          });

          signal?.addEventListener('abort', () => {
            reject(new DOMException('Batch export aborted', 'AbortError'));
          });

          // Keep unresolved until canceled.
          void resolve;
        })
    );

    render(<BatchExportAccordion />);
    fireEvent.click(screen.getByRole('button', { name: /Batch Export/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Export 3 Videos/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Export 3 Videos/i }));

    await waitFor(() => {
      expect(screen.getByText('Progress: 1/3')).toBeInTheDocument();
    });

    const cancelButton = screen
      .getAllByRole('button')
      .find((button) => button.className.includes('border-red-500'));
    expect(cancelButton).toBeDefined();

    fireEvent.click(cancelButton as HTMLButtonElement);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          message: 'Batch export canceled',
        })
      );
    });
  });

  it('shows error toast when export fails', async () => {
    mockExportPlaylistBatchAsZip.mockRejectedValue(new Error('Export backend failed'));

    render(<BatchExportAccordion />);
    fireEvent.click(screen.getByRole('button', { name: /Batch Export/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Export 3 Videos/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Export 3 Videos/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: 'Export backend failed',
        })
      );
    });
  });
});
