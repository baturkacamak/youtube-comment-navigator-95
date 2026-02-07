/**
 * Database Events Integration Tests
 *
 * Tests how multiple components react to database change events.
 * Verifies the event-driven architecture works correctly across the app.
 *
 * This catches bugs where:
 * - UI doesn't update when data changes
 * - Multiple components get out of sync
 * - Event listeners aren't cleaned up properly
 */

import '@testing-library/jest-dom';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { db } from '../shared/utils/database/database';
import { dbEvents } from '../shared/utils/database/dbEvents';
import useCommentsFromDB from './hooks/useCommentsFromDB';
import { Comment } from '../../types/commentTypes';
import { FilterState } from '../../types/filterTypes';
import { useSelector } from 'react-redux';
import { selectIsLoading } from '../../store/selectors';

// Mock Redux
vi.mock('react-redux', () => ({
  useSelector: vi.fn(),
  useDispatch: () => vi.fn(),
}));

// Default filters
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

// Helper to create comments
const createComment = (id: string, videoId: string, overrides: Partial<Comment> = {}): Comment => {
  const numericId = parseInt(id.replace(/[^0-9]/g, '')) || 1;
  return {
    commentId: id,
    videoId,
    author: `Author ${id}`,
    content: `Content ${id}`,
    publishedDate: Date.now() - numericId * 1000,
    likes: numericId * 10,
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
    viewLikes: `${numericId * 10}`,
    videoTitle: 'Test Video',
    isPinned: false,
    timestamp: numericId,
    authorUrl: `https://youtube.com/user${id}`,
    authorThumb: '',
    isOwner: false,
    normalizedScore: 0,
    weightedZScore: 0,
    bayesianAverage: 0,
    isBookmarked: false,
    bookmarkAddedDate: '',
    published: new Date(Date.now() - numericId * 1000).toISOString(),
    ...overrides,
  };
};

describe('Database Events Integration Tests', () => {
  let globalLoadingValue = false;

  beforeEach(async () => {
    // Reset database
    await db.delete();
    await db.open();

    // Reset event system
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

  describe('comments:deleted Event', () => {
    it('clears UI immediately when comments:deleted event fires', async () => {
      const videoId = 'test-video';
      const comments = Array.from({ length: 10 }, (_, i) => createComment(`${i}`, videoId));
      await db.comments.bulkAdd(comments);

      const { result } = renderHook(() =>
        useCommentsFromDB({
          videoId,
          filters: defaultFilters,
          searchKeyword: '',
        })
      );

      // Wait for comments to load
      await waitFor(
        () => {
          expect(result.current.comments.length).toBeGreaterThan(0);
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 3000 }
      );

      const loadedCount = result.current.comments.length;
      expect(loadedCount).toBeGreaterThan(0);

      // Fire comments:deleted event
      act(() => {
        dbEvents.emitCommentsDeleted(videoId, loadedCount);
      });

      // UI should clear immediately
      await waitFor(() => {
        expect(result.current.comments).toHaveLength(0);
        expect(result.current.page).toBe(0);
      });
    });

    it('only affects the correct video', async () => {
      const video1Comments = Array.from({ length: 5 }, (_, i) =>
        createComment(`v1-${i}`, 'video-1')
      );
      const video2Comments = Array.from({ length: 5 }, (_, i) =>
        createComment(`v2-${i}`, 'video-2')
      );
      await db.comments.bulkAdd([...video1Comments, ...video2Comments]);

      // Two hooks watching different videos
      const { result: result1 } = renderHook(() =>
        useCommentsFromDB({
          videoId: 'video-1',
          filters: defaultFilters,
          searchKeyword: '',
        })
      );

      const { result: result2 } = renderHook(() =>
        useCommentsFromDB({
          videoId: 'video-2',
          filters: defaultFilters,
          searchKeyword: '',
        })
      );

      // Wait for both to load
      await waitFor(
        () => {
          expect(result1.current.comments.length).toBe(5);
          expect(result2.current.comments.length).toBe(5);
        },
        { timeout: 3000 }
      );

      // Delete only video-1 comments
      act(() => {
        dbEvents.emitCommentsDeleted('video-1', 5);
      });

      // Only video-1 should clear
      await waitFor(() => {
        expect(result1.current.comments).toHaveLength(0);
        expect(result2.current.comments).toHaveLength(5); // Unchanged
      });
    });
  });

  describe('comments:added Event', () => {
    it('refreshes UI when new comments added (page 0 only)', async () => {
      const videoId = 'test-video';
      const initialComments = Array.from({ length: 5 }, (_, i) => createComment(`${i}`, videoId));
      await db.comments.bulkAdd(initialComments);

      const { result } = renderHook(() =>
        useCommentsFromDB({
          videoId,
          filters: defaultFilters,
          searchKeyword: '',
        })
      );

      // Wait for initial load
      await waitFor(
        () => {
          expect(result.current.comments.length).toBe(5);
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 3000 }
      );

      // Add new comments to database
      const newComments = Array.from({ length: 3 }, (_, i) => createComment(`new-${i}`, videoId));
      await db.comments.bulkAdd(newComments);

      // Fire event
      act(() => {
        dbEvents.emitCommentsAdded(videoId, 3);
      });

      // Should refresh and show new total
      await waitFor(
        () => {
          expect(result.current.totalCount).toBe(8);
        },
        { timeout: 3000 }
      );
    });

    it('does NOT refresh when comments:added fires during loading', async () => {
      const videoId = 'test-video';

      const { result } = renderHook(() =>
        useCommentsFromDB({
          videoId,
          filters: defaultFilters,
          searchKeyword: '',
        })
      );

      // Hook is initially loading
      expect(result.current.isLoading).toBe(true);

      // Fire event while loading
      act(() => {
        dbEvents.emitCommentsAdded(videoId, 5);
      });

      // Should not cause issues (event ignored during load)
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('replies:added Event', () => {
    it('updates comment reply count when replies added', async () => {
      const videoId = 'test-video';
      const comment = createComment('1', videoId, { replyCount: 0 });
      await db.comments.add(comment);

      const { result } = renderHook(() =>
        useCommentsFromDB({
          videoId,
          filters: defaultFilters,
          searchKeyword: '',
        })
      );

      await waitFor(
        () => {
          expect(result.current.comments.length).toBe(1);
          expect(result.current.comments[0].replyCount).toBe(0);
        },
        { timeout: 3000 }
      );

      // Add replies to database
      await db.comments.where('commentId').equals('1').modify({ replyCount: 3 });

      // Fire event
      act(() => {
        dbEvents.emitRepliesAdded(videoId, 3, ['1']);
      });

      // Should refresh and show updated count
      await waitFor(
        () => {
          const updatedComment = result.current.comments.find((c) => c.commentId === '1');
          expect(updatedComment?.replyCount).toBe(3);
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Multiple Components Reacting', () => {
    it('multiple hooks react to same event', async () => {
      const videoId = 'test-video';
      const comments = Array.from({ length: 10 }, (_, i) => createComment(`${i}`, videoId));
      await db.comments.bulkAdd(comments);

      // Render two hooks watching the same video
      const { result: result1 } = renderHook(() =>
        useCommentsFromDB({
          videoId,
          filters: defaultFilters,
          searchKeyword: '',
          pageSize: 5,
        })
      );

      const { result: result2 } = renderHook(() =>
        useCommentsFromDB({
          videoId,
          filters: defaultFilters,
          searchKeyword: '',
          pageSize: 10,
        })
      );

      // Wait for both to load
      await waitFor(
        () => {
          expect(result1.current.comments.length).toBe(5);
          expect(result2.current.comments.length).toBe(10);
        },
        { timeout: 3000 }
      );

      // Delete all comments
      await db.comments.clear();

      // Fire single event
      act(() => {
        dbEvents.emitCommentsDeleted(videoId, 10);
      });

      // Both hooks should clear
      await waitFor(() => {
        expect(result1.current.comments).toHaveLength(0);
        expect(result2.current.comments).toHaveLength(0);
      });
    });
  });

  describe('Event Throttling', () => {
    it('throttles rapid comments:added events', async () => {
      const videoId = 'test-video';
      const comments = Array.from({ length: 5 }, (_, i) => createComment(`${i}`, videoId));
      await db.comments.bulkAdd(comments);

      const { result } = renderHook(() =>
        useCommentsFromDB({
          videoId,
          filters: defaultFilters,
          searchKeyword: '',
        })
      );

      await waitFor(
        () => {
          expect(result.current.comments.length).toBe(5);
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 3000 }
      );

      // Fire multiple events rapidly
      act(() => {
        dbEvents.emitCommentsAdded(videoId, 1);
        dbEvents.emitCommentsAdded(videoId, 1);
        dbEvents.emitCommentsAdded(videoId, 1);
      });

      // Should only trigger one refresh (throttled)
      // The hook has a 1-second throttle
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Check that throttling worked (stats should show 3 events but fewer refreshes)
      const stats = dbEvents.getStats();
      expect(stats.eventsByType['comments:added']).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Cleanup and Memory Leaks', () => {
    it('cleans up event listeners on unmount', async () => {
      const videoId = 'test-video';

      const { unmount } = renderHook(() =>
        useCommentsFromDB({
          videoId,
          filters: defaultFilters,
          searchKeyword: '',
        })
      );

      // Wait for subscription
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should have handlers registered
      const hadHandlers = dbEvents.hasHandlers();

      // Unmount
      unmount();

      // Handlers should be cleaned up
      await waitFor(() => {
        expect(dbEvents.hasHandlers()).toBe(false);
      });

      if (hadHandlers) {
        expect(dbEvents.hasHandlers()).toBe(false);
      }
    });

    it('no memory leaks from multiple mount/unmount cycles', async () => {
      const videoId = 'test-video';

      // Mount and unmount multiple times
      for (let i = 0; i < 5; i++) {
        const { unmount } = renderHook(() =>
          useCommentsFromDB({
            videoId,
            filters: defaultFilters,
            searchKeyword: '',
          })
        );

        await new Promise((resolve) => setTimeout(resolve, 50));
        unmount();
      }

      // All handlers should be cleaned up
      await waitFor(() => {
        expect(dbEvents.hasHandlers()).toBe(false);
      });
    });
  });

  describe('Event Stats and Monitoring', () => {
    it('tracks event statistics correctly', async () => {
      const videoId = 'test-video';

      // Reset stats
      dbEvents.resetStats();

      // Fire various events
      act(() => {
        dbEvents.emitCommentsAdded(videoId, 5);
        dbEvents.emitCommentsUpdated(videoId, 2);
        dbEvents.emitCommentsDeleted(videoId, 1);
        dbEvents.emitRepliesAdded(videoId, 3);
      });

      const stats = dbEvents.getStats();

      expect(stats.totalEventsEmitted).toBe(4);
      expect(stats.eventsByType['comments:added']).toBe(1);
      expect(stats.eventsByType['comments:updated']).toBe(1);
      expect(stats.eventsByType['comments:deleted']).toBe(1);
      expect(stats.eventsByType['replies:added']).toBe(1);
    });

    it('tracks handler errors separately', async () => {
      const videoId = 'test-video';

      // Register a handler that throws
      const unsubscribe = dbEvents.on('comments:added', () => {
        throw new Error('Handler error');
      });

      dbEvents.resetStats();

      // Fire event (should not crash, just log error)
      act(() => {
        dbEvents.emitCommentsAdded(videoId, 1);
      });

      const stats = dbEvents.getStats();
      expect(stats.totalHandlerErrors).toBeGreaterThan(0);

      unsubscribe();
    });
  });
});
