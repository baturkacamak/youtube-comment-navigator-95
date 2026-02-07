import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { db } from '../../shared/utils/database/database';
import useCommentsFromDB from './useCommentsFromDB';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSelector } from 'react-redux';
import { selectIsLoading } from '../../../store/selectors';
import { dbEvents } from '../../shared/utils/database/dbEvents';
import { Comment } from '../../../types/commentTypes';
import { FilterState } from '../../../types/filterTypes';

// Mock Redux
vi.mock('react-redux', () => ({
  useSelector: vi.fn(),
  useDispatch: () => vi.fn(),
}));

// Default filters for tests
const defaultFilters: FilterState = {
  keyword: '',
  verified: false,
  hasLinks: false,
  sortBy: '',
  sortOrder: '',
  likesThreshold: { min: 0, max: Infinity },
  repliesLimit: { min: 0, max: Infinity },
  wordCount: { min: 0, max: Infinity },
  dateTimeRange: { start: '', end: '' },
};

// Helper to create mock comments
const createMockComment = (id: string, videoId: string, overrides: Partial<Comment> = {}): Comment => ({
  commentId: id,
  videoId,
  author: `User ${id}`,
  content: `Content ${id}`,
  publishedDate: Date.now() - parseInt(id) * 1000,
  likes: parseInt(id) * 10,
  replyCount: 0,
  replyLevel: 0,
  wordCount: 2,
  authorAvatarUrl: '',
  authorChannelId: `channel-${id}`,
  isAuthorContentCreator: false,
  isMember: false,
  hasLinks: false,
  hasTimestamp: false,
  isHearted: false,
  isDonated: false,
  authorBadgeUrl: '',
  authorMemberSince: '',
  donationAmount: '',
  viewLikes: `${parseInt(id) * 10}`,
  videoTitle: 'Test Video',
  isPinned: false,
  timestamp: parseInt(id),
  authorUrl: `https://youtube.com/user${id}`,
  authorThumb: '',
  isOwner: false,
  normalizedScore: 0,
  weightedZScore: 0,
  bayesianAverage: 0,
  isBookmarked: false,
  bookmarkAddedDate: 0,
  published: new Date(Date.now() - parseInt(id) * 1000).toISOString(),
  ...overrides,
});

describe('useCommentsFromDB', () => {
  const videoId = 'test-video-id';
  let globalLoadingValue = false;

  beforeEach(async () => {
    // Reset database
    await db.delete();
    await db.open();

    // Reset dbEvents to clear any listeners
    dbEvents.clear();
    dbEvents.resetStats();

    // Mock Redux selector
    globalLoadingValue = false;
    vi.mocked(useSelector).mockImplementation((selector: any) => {
      if (selector === selectIsLoading) return globalLoadingValue;
      return null;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('State Transitions (Loader Bug) - CRITICAL', () => {
    it('✅ BUG FIX: clears comments immediately when globalLoading transitions false → true', async () => {
      // Seed database with comments
      const comments = Array.from({ length: 10 }, (_, i) =>
        createMockComment(`${i + 1}`, videoId)
      );
      await db.comments.bulkAdd(comments);

      // Render hook with globalLoading = false
      const { result, rerender } = renderHook(() =>
        useCommentsFromDB({
          videoId,
          filters: defaultFilters,
          searchKeyword: '',
        })
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.comments.length).toBeGreaterThan(0);
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 3000 });

      const loadedCommentsCount = result.current.comments.length;
      expect(loadedCommentsCount).toBeGreaterThan(0);

      // ACT: Simulate navigation (globalLoading → true)
      globalLoadingValue = true;
      rerender();

      // ASSERT: Comments cleared immediately (THIS WOULD HAVE FAILED BEFORE THE FIX)
      await waitFor(() => {
        expect(result.current.comments).toHaveLength(0);
      }, { timeout: 1000 });
    });

    it('does NOT clear comments when globalLoading is already true', async () => {
      // Start with globalLoading = true
      globalLoadingValue = true;

      const { result } = renderHook(() =>
        useCommentsFromDB({
          videoId,
          filters: defaultFilters,
          searchKeyword: '',
        })
      );

      // Comments should stay empty (no false clearing)
      expect(result.current.comments).toHaveLength(0);
      expect(result.current.isLoading).toBe(true);
    });

    it('does NOT clear comments when globalLoading transitions true → false', async () => {
      // Start with globalLoading = true
      globalLoadingValue = true;

      const { result, rerender } = renderHook(() =>
        useCommentsFromDB({
          videoId,
          filters: defaultFilters,
          searchKeyword: '',
        })
      );

      // Transition to false
      globalLoadingValue = false;
      rerender();

      // Should not trigger any clearing
      expect(result.current.comments).toHaveLength(0);
    });
  });

  describe('Database Events', () => {
    it('clears comments and resets page when comments:deleted event fires', async () => {
      // Seed database
      const comments = Array.from({ length: 5 }, (_, i) =>
        createMockComment(`${i + 1}`, videoId)
      );
      await db.comments.bulkAdd(comments);

      const { result } = renderHook(() =>
        useCommentsFromDB({
          videoId,
          filters: defaultFilters,
          searchKeyword: '',
        })
      );

      // Wait for comments to load
      await waitFor(() => {
        expect(result.current.comments.length).toBe(5);
      }, { timeout: 3000 });

      // ACT: Fire comments:deleted event
      act(() => {
        dbEvents.emitCommentsDeleted(videoId, 5);
      });

      // ASSERT: Comments cleared and page reset
      await waitFor(() => {
        expect(result.current.comments).toHaveLength(0);
        expect(result.current.page).toBe(0);
      });
    });

    it('does NOT refresh during active loading (race condition prevention)', async () => {
      const { result } = renderHook(() =>
        useCommentsFromDB({
          videoId,
          filters: defaultFilters,
          searchKeyword: '',
        })
      );

      // Hook is still loading initially
      expect(result.current.isLoading).toBe(true);

      // Fire event while loading
      act(() => {
        dbEvents.emitCommentsAdded(videoId, 5);
      });

      // Should not cause issues (event ignored during load)
      expect(result.current.isLoading).toBe(true);
    });

    it('ignores events for different videoId', async () => {
      const comments = Array.from({ length: 5 }, (_, i) =>
        createMockComment(`${i + 1}`, videoId)
      );
      await db.comments.bulkAdd(comments);

      const { result } = renderHook(() =>
        useCommentsFromDB({
          videoId,
          filters: defaultFilters,
          searchKeyword: '',
        })
      );

      await waitFor(() => {
        expect(result.current.comments.length).toBe(5);
      }, { timeout: 3000 });

      const initialLength = result.current.comments.length;

      // Fire event for different video
      act(() => {
        dbEvents.emitCommentsDeleted('different-video-id', 100);
      });

      // Should not affect our comments
      expect(result.current.comments.length).toBe(initialLength);
    });
  });

  describe('Pagination', () => {
    it('loads initial page from database on mount', async () => {
      const comments = Array.from({ length: 30 }, (_, i) =>
        createMockComment(`${i + 1}`, videoId)
      );
      await db.comments.bulkAdd(comments);

      const { result } = renderHook(() =>
        useCommentsFromDB({
          videoId,
          filters: defaultFilters,
          searchKeyword: '',
          pageSize: 20,
        })
      );

      await waitFor(() => {
        expect(result.current.comments.length).toBe(20);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.page).toBe(0);
      }, { timeout: 3000 });
    });

    it('loads next page when loadMore() called', async () => {
      const comments = Array.from({ length: 50 }, (_, i) =>
        createMockComment(`${i + 1}`, videoId)
      );
      await db.comments.bulkAdd(comments);

      const { result } = renderHook(() =>
        useCommentsFromDB({
          videoId,
          filters: defaultFilters,
          searchKeyword: '',
          pageSize: 20,
        })
      );

      // Wait for initial page
      await waitFor(() => {
        expect(result.current.comments.length).toBe(20);
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 3000 });

      // Load more
      await act(async () => {
        await result.current.loadMore();
      });

      // Should have 40 comments now
      await waitFor(() => {
        expect(result.current.comments.length).toBe(40);
        expect(result.current.page).toBe(1);
      }, { timeout: 3000 });
    });

    it('hasMore becomes false when all comments loaded', async () => {
      const comments = Array.from({ length: 25 }, (_, i) =>
        createMockComment(`${i + 1}`, videoId)
      );
      await db.comments.bulkAdd(comments);

      const { result } = renderHook(() =>
        useCommentsFromDB({
          videoId,
          filters: defaultFilters,
          searchKeyword: '',
          pageSize: 20,
        })
      );

      await waitFor(() => {
        expect(result.current.comments.length).toBe(20);
        expect(result.current.hasMore).toBe(true);
      }, { timeout: 3000 });

      // Load more (should get remaining 5)
      await act(async () => {
        await result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.comments.length).toBe(25);
        expect(result.current.hasMore).toBe(false);
      }, { timeout: 3000 });
    });
  });

  describe('Edge Cases', () => {
    it('cleans up event listeners on unmount', async () => {
      const { unmount } = renderHook(() =>
        useCommentsFromDB({
          videoId,
          filters: defaultFilters,
          searchKeyword: '',
        })
      );

      // Wait a moment for subscription
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have handlers
      const hadHandlers = dbEvents.hasHandlers();

      unmount();

      // Event handlers should be cleaned up
      await waitFor(() => {
        expect(dbEvents.hasHandlers()).toBe(false);
      });

      // Only fail if we had handlers to begin with
      if (hadHandlers) {
        expect(dbEvents.hasHandlers()).toBe(false);
      }
    });

    it('refresh() reloads from page 0', async () => {
      const comments = Array.from({ length: 50 }, (_, i) =>
        createMockComment(`${i + 1}`, videoId)
      );
      await db.comments.bulkAdd(comments);

      const { result } = renderHook(() =>
        useCommentsFromDB({
          videoId,
          filters: defaultFilters,
          searchKeyword: '',
          pageSize: 20,
        })
      );

      await waitFor(() => {
        expect(result.current.comments.length).toBe(20);
      }, { timeout: 3000 });

      // Load page 2
      await act(async () => {
        await result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.page).toBe(1);
        expect(result.current.comments.length).toBe(40);
      }, { timeout: 3000 });

      // Refresh
      await act(async () => {
        await result.current.refresh();
      });

      // Should reset to page 0 with 20 comments
      await waitFor(() => {
        expect(result.current.page).toBe(0);
        expect(result.current.comments.length).toBe(20);
      }, { timeout: 3000 });
    });
  });

  describe('totalCount reactivity', () => {
    it('updates totalCount when comments are added to database', async () => {
      const initialComments = Array.from({ length: 5 }, (_, i) =>
        createMockComment(`${i + 1}`, videoId)
      );
      await db.comments.bulkAdd(initialComments);

      const { result } = renderHook(() =>
        useCommentsFromDB({
          videoId,
          filters: defaultFilters,
          searchKeyword: '',
        })
      );

      await waitFor(() => {
        expect(result.current.totalCount).toBe(5);
      }, { timeout: 3000 });

      // Add more comments
      const newComments = Array.from({ length: 3 }, (_, i) =>
        createMockComment(`${i + 10}`, videoId)
      );
      await db.comments.bulkAdd(newComments);

      // totalCount should update automatically (useLiveQuery)
      await waitFor(() => {
        expect(result.current.totalCount).toBe(8);
      }, { timeout: 3000 });
    });

    it('updates totalCount when comments are deleted from database', async () => {
      const comments = Array.from({ length: 10 }, (_, i) =>
        createMockComment(`${i + 1}`, videoId)
      );
      await db.comments.bulkAdd(comments);

      const { result } = renderHook(() =>
        useCommentsFromDB({
          videoId,
          filters: defaultFilters,
          searchKeyword: '',
        })
      );

      await waitFor(() => {
        expect(result.current.totalCount).toBe(10);
      }, { timeout: 3000 });

      // Delete some comments
      await db.comments.where('commentId').anyOf(['1', '2', '3']).delete();

      // totalCount should update automatically
      await waitFor(() => {
        expect(result.current.totalCount).toBe(7);
      }, { timeout: 3000 });
    });
  });
});
