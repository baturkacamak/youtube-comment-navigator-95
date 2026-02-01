import { renderHook, act } from '@testing-library/react-hooks';
import useLoadContent from './useLoadContent';
import { useDispatch } from 'react-redux';
import { useToast } from '../contexts/ToastContext';
import { fetchAndProcessLiveChat } from '../../comments/services/liveChat/fetchLiveChat';
import {
  hasLiveChatMessages,
  deleteLiveChatMessages,
  deleteLiveChatReplies,
} from '../../comments/services/liveChat/liveChatDatabase';
import { extractVideoId } from '../../comments/services/remote/utils';
import { setLiveChatError, setLiveChatLoading } from '../../../store/store';

// Mock dependencies
vi.mock('react-redux', () => ({
  useDispatch: vi.fn(),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../comments/services/remote/remoteFetch', () => ({
  fetchCommentsFromRemote: vi.fn(),
}));

vi.mock('../../transcripts/services/fetchTranscript', () => ({
  fetchTranscript: vi.fn(),
}));

vi.mock('../../comments/services/liveChat/fetchLiveChat', () => ({
  fetchAndProcessLiveChat: vi.fn(),
}));

vi.mock('../../comments/services/liveChat/liveChatDatabase', () => ({
  hasLiveChatMessages: vi.fn(),
  deleteLiveChatMessages: vi.fn(),
  deleteLiveChatReplies: vi.fn(),
}));

vi.mock('../../comments/services/remote/utils', () => ({
  extractVideoId: vi.fn(),
}));

vi.mock('../../utils/logger', () => ({
  default: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock error handler
vi.mock('../../comments/services/liveChat/liveChatErrorHandler', () => ({
  shouldShowLiveChatErrorToast: vi.fn().mockReturnValue(true),
  getLiveChatFetchErrorMessage: vi.fn().mockReturnValue('Live Chat Error'),
}));

describe('useLoadContent', () => {
  const mockDispatch = vi.fn();
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useDispatch as any).mockReturnValue(mockDispatch);
    (useToast as any).mockReturnValue({ showToast: mockShowToast });
    (extractVideoId as any).mockReturnValue('test-video-id');
  });

  describe('loadLiveChat', () => {
    it('handles missing videoId', async () => {
      (extractVideoId as any).mockReturnValue(null);
      const { result } = renderHook(() => useLoadContent());

      await act(async () => {
        await result.current.loadLiveChat();
      });

      expect(mockDispatch).toHaveBeenCalledWith(setLiveChatError('No video ID found'));
      expect(fetchAndProcessLiveChat).not.toHaveBeenCalled();
    });

    it('skips fetch if data exists in DB (cache hit)', async () => {
      (hasLiveChatMessages as any).mockResolvedValue(true);
      const { result } = renderHook(() => useLoadContent());

      await act(async () => {
        await result.current.loadLiveChat(false); // No bypass
      });

      expect(mockDispatch).toHaveBeenCalledWith(setLiveChatLoading(true));
      expect(hasLiveChatMessages).toHaveBeenCalledWith('test-video-id');
      expect(fetchAndProcessLiveChat).not.toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(setLiveChatLoading(false));
    });

    it('fetches if data does NOT exist in DB', async () => {
      (hasLiveChatMessages as any).mockResolvedValue(false);
      const { result } = renderHook(() => useLoadContent());

      await act(async () => {
        await result.current.loadLiveChat(false);
      });

      expect(fetchAndProcessLiveChat).toHaveBeenCalled();
    });

    it('bypasses cache: clears DB and fetches', async () => {
      // Even if it exists, we bypass
      (hasLiveChatMessages as any).mockResolvedValue(true);
      const { result } = renderHook(() => useLoadContent());

      await act(async () => {
        await result.current.loadLiveChat(true); // Bypass cache
      });

      expect(deleteLiveChatMessages).toHaveBeenCalledWith('test-video-id');
      expect(deleteLiveChatReplies).toHaveBeenCalledWith('test-video-id');
      expect(fetchAndProcessLiveChat).toHaveBeenCalled();
    });

    it('handles errors and shows toast', async () => {
      (hasLiveChatMessages as any).mockResolvedValue(false);
      (fetchAndProcessLiveChat as any).mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useLoadContent());

      await act(async () => {
        await result.current.loadLiveChat();
      });

      expect(mockDispatch).toHaveBeenCalledWith(setLiveChatError('Network Error'));
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: 'Live Chat Error',
        })
      );
      expect(mockDispatch).toHaveBeenCalledWith(setLiveChatLoading(false));
    });
  });
});
