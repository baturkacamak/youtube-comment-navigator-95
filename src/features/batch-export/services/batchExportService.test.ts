import { exportPlaylistBatchAsZip } from './batchExportService';
import { BatchExportParams, PlaylistVideoItem } from '../types';

const {
  mockFetchRepliesJsonDataFromRemote,
  mockFetchContinuationTokenFromRemote,
  mockProcessRawJsonCommentsData,
  mockFetchTranscriptFromRemote,
  mockCreateZipArchive,
  mockFetchNext,
  mockFetchPlayer,
} = vi.hoisted(() => ({
  mockFetchRepliesJsonDataFromRemote: vi.fn(),
  mockFetchContinuationTokenFromRemote: vi.fn(),
  mockProcessRawJsonCommentsData: vi.fn(),
  mockFetchTranscriptFromRemote: vi.fn(),
  mockCreateZipArchive: vi.fn(),
  mockFetchNext: vi.fn(),
  mockFetchPlayer: vi.fn(),
}));

vi.mock('../../comments/services/remote/fetchReplies', () => ({
  fetchRepliesJsonDataFromRemote: mockFetchRepliesJsonDataFromRemote,
}));

vi.mock('../../comments/services/remote/fetchContinuationTokenFromRemote', () => ({
  fetchContinuationTokenFromRemote: mockFetchContinuationTokenFromRemote,
}));

vi.mock('../../comments/utils/comments/retrieveYouTubeCommentPaths', () => ({
  processRawJsonCommentsData: mockProcessRawJsonCommentsData,
}));

vi.mock('../../transcripts/services/remoteFetch', () => ({
  fetchTranscriptFromRemote: mockFetchTranscriptFromRemote,
}));

vi.mock('../utils/createZip', () => ({
  createZipArchive: mockCreateZipArchive,
  textToBytes: (input: string) => new TextEncoder().encode(input),
}));

vi.mock('../../shared/services/youtubeApi', () => ({
  youtubeApi: {
    fetchNext: mockFetchNext,
    fetchPlayer: mockFetchPlayer,
  },
}));

describe('batchExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    window.history.pushState({}, '', '/watch?v=current_video&list=PL001');

    mockFetchContinuationTokenFromRemote.mockResolvedValue('token_first');
    mockFetchNext.mockResolvedValue({
      onResponseReceivedEndpoints: [
        {
          appendContinuationItemsAction: {
            continuationItems: [],
          },
        },
      ],
    });
    mockFetchRepliesJsonDataFromRemote.mockResolvedValue([]);
    mockProcessRawJsonCommentsData.mockReturnValue({
      items: [
        {
          author: 'Author',
          likes: 3,
          viewLikes: '3',
          content: 'Comment body',
          published: '1 day ago',
          publishedDate: 1730000000000,
          authorAvatarUrl: '',
          isAuthorContentCreator: false,
          authorChannelId: 'channel_1',
          replyCount: 0,
          commentId: 'comment_1',
          replyLevel: 0,
          hasTimestamp: false,
          hasLinks: false,
          videoId: 'video_1',
        },
      ],
    });
    mockFetchTranscriptFromRemote.mockResolvedValue({
      items: [{ start: 0, duration: 1.2, text: 'Transcript line' }],
      totalDuration: 1.2,
    });
    mockFetchPlayer.mockResolvedValue({
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [{ baseUrl: 'https://example.com/captions' }],
        },
      },
      videoDetails: {
        title: 'Video One',
        shortDescription: 'Description text',
        author: 'Channel One',
      },
      microformat: {
        playerMicroformatRenderer: {
          publishDate: '2026-01-01',
        },
      },
    });
    mockCreateZipArchive.mockReturnValue(new Blob(['zip-content']));

    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: vi.fn(() => 'blob:mock'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: vi.fn(),
    });
  });

  it('builds ZIP entries and manifest for selected videos', async () => {
    const selectedVideos: PlaylistVideoItem[] = [
      { videoId: 'video_1', title: 'Video One', index: 1 },
    ];

    const params: BatchExportParams = {
      playlistId: 'PL001',
      selectedVideos,
      selectedContent: {
        comments: true,
        transcript: true,
        description: true,
      },
      selectedFormats: {
        comments: 'json',
        transcript: 'txt',
        description: 'txt',
      },
    };

    const outcome = await exportPlaylistBatchAsZip(params);

    expect(outcome.fileName).toContain('playlist_PL001_');
    expect(mockCreateZipArchive).toHaveBeenCalledTimes(1);

    const entries = mockCreateZipArchive.mock.calls[0][0] as Array<{
      path: string;
      data: Uint8Array;
    }>;

    expect(entries.some((entry) => entry.path.endsWith('/comments.json'))).toBe(true);
    expect(entries.some((entry) => entry.path.endsWith('/transcript.txt'))).toBe(true);
    expect(entries.some((entry) => entry.path.endsWith('/description.txt'))).toBe(true);
    expect(entries.some((entry) => entry.path === 'manifest.json')).toBe(true);

    const manifestEntry = entries.find((entry) => entry.path === 'manifest.json');
    expect(manifestEntry).toBeDefined();

    const manifestText = new TextDecoder().decode(manifestEntry?.data);
    const manifest = JSON.parse(manifestText);

    expect(manifest.playlistId).toBe('PL001');
    expect(manifest.totalRequestedVideos).toBe(1);
    expect(manifest.results).toHaveLength(1);
    expect(manifest.results[0].status).toBe('success');
    expect(manifest.selectedFormats).toEqual({
      comments: 'json',
      transcript: 'txt',
      description: 'txt',
    });
  });
});
