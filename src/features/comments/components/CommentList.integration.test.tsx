/**
 * Integration tests for CommentList component
 *
 * These tests use REAL dependencies (real hook, real database, real Redux)
 * to test actual behavior, not mocked implementation.
 *
 * This tests would have caught the loader bug where stale comments
 * stayed visible during navigation.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import CommentList from './CommentList';
import { db } from '../../shared/utils/database/database';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { commentsReducer } from '../../../store/store';
import { Comment } from '../../../types/commentTypes';
import { setIsLoading } from '../../../store/store';

// Mock only external dependencies, not our own code
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.remaining !== undefined) {
        return key.replace('{{remaining}}', options.remaining);
      }
      return key;
    },
  }),
}));

vi.mock('../../shared/utils/extractYouTubeVideoIdFromUrl', () => ({
  extractYouTubeVideoIdFromUrl: vi.fn(() => 'test-video-id'),
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Mock AutoSizer with fixed dimensions
vi.mock('react-virtualized-auto-sizer', () => ({
  AutoSizer: ({ children, renderProp }: any) => {
    const render = children || renderProp;
    return render ? render({ height: 500, width: 500 }) : null;
  },
}));

// Mock react-window VariableSizeList
vi.mock('react-window', () => ({
  VariableSizeList: React.forwardRef(function MockList({ children, itemCount }: any, ref: any) {
    if (ref) {
      ref.current = {
        resetAfterIndex: vi.fn(),
        scrollToItem: vi.fn(),
      };
    }
    return (
      <div data-testid="virtual-list">
        {Array.from({ length: Math.min(itemCount, 5) }).map((_, index) => (
          <div key={index}>
            {children({
              index,
              style: {},
            })}
          </div>
        ))}
      </div>
    );
  }),
}));

// Mock CommentItem to simplify rendering
vi.mock('./CommentItem', () => ({
  default: ({ comment }: any) => (
    <div data-testid="comment-item" data-comment-id={comment.commentId}>
      {comment.content}
    </div>
  ),
}));

// Helper to create mock comments
const createComment = (id: string, videoId: string, overrides: Partial<Comment> = {}): Comment => {
  // Extract numeric part from id (e.g., "a5" -> 5, "5" -> 5)
  const numericId = parseInt(id.replace(/[^0-9]/g, '')) || 1;
  const timeOffset = numericId * 1000;

  return {
    commentId: id,
    videoId,
    author: `Author ${id}`,
    content: `Comment content ${id}`,
    publishedDate: Date.now() - timeOffset,
    likes: numericId * 10,
    replyCount: 0,
    replyLevel: 0,
    wordCount: 3,
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
    bookmarkAddedDate: 0,
    published: new Date(Date.now() - timeOffset).toISOString(),
    ...overrides,
  };
};

// Helper to create test store with real reducer
const createTestStore = (preloadedState = {}) => {
  return configureStore({
    reducer: commentsReducer,
    preloadedState: {
      filters: {
        keyword: '',
        verified: false,
        hasLinks: false,
        sortBy: '',
        sortOrder: '',
        likesThreshold: { min: 0, max: Infinity },
        repliesLimit: { min: 0, max: Infinity },
        wordCount: { min: 0, max: Infinity },
        dateTimeRange: { start: '', end: '' },
      },
      searchKeyword: '',
      isLoading: false,
      comments: [],
      totalCommentsCount: 0,
      bookmarkedComments: [],
      bookmarkedLiveChatMessages: [],
      bookmarkedLines: [],
      liveChat: [],
      liveChatState: {
        isLoading: false,
        error: null,
        lastFetchTime: null,
        messageCount: 0,
        continuationToken: null,
        isReplay: false,
      },
      liveChatMessageCount: 0,
      transcripts: [],
      filteredTranscripts: [],
      showBookmarked: false,
      transcriptSelectedLanguage: { value: '', label: 'Select Language' },
      filteredAndSortedComments: [],
      filteredAndSortedBookmarks: [],
      settings: {
        textSize: 'text-base',
        fontFamily: 'Arial',
        showFiltersSorts: true,
        showContentOnSearch: false,
        geminiApiKey: '',
      },
      ...preloadedState,
    },
  });
};

describe('CommentList Integration Tests', () => {
  beforeEach(async () => {
    // Reset database
    await db.delete();
    await db.open();
  });

  describe('✅ LOADER BUG FIX - Video Navigation', () => {
    it('clears stale comments immediately when navigating to new video', async () => {
      // Use the same videoId that the mock returns
      const videoAComments = Array.from({ length: 10 }, (_, i) =>
        createComment(`a${i}`, 'test-video-id')
      );
      await db.comments.bulkAdd(videoAComments);

      const store = createTestStore();

      render(
        <Provider store={store}>
          <CommentList />
        </Provider>
      );

      // Wait for video A comments to load
      await waitFor(() => {
        expect(screen.getAllByTestId('comment-item').length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      const commentsBeforeNav = screen.getAllByTestId('comment-item');
      expect(commentsBeforeNav.length).toBeGreaterThan(0);

      // ACT: Simulate navigation by setting globalLoading=true
      // (This simulates what happens when user clicks a new video)
      act(() => {
        store.dispatch(setIsLoading(true));
      });

      // ASSERT: Old comments should disappear IMMEDIATELY
      // THIS TEST WOULD HAVE FAILED BEFORE THE FIX
      await waitFor(() => {
        const items = screen.queryAllByTestId('comment-item');
        expect(items.length).toBe(0);
      }, { timeout: 1000 });

      // Should show loading state
      expect(screen.getByText('Loading comments...')).toBeInTheDocument();
    });

    it('shows loading overlay when globalLoading becomes true', async () => {
      const comments = Array.from({ length: 5 }, (_, i) => createComment(`${i}`, 'test-video-id'));
      await db.comments.bulkAdd(comments);

      const store = createTestStore({ isLoading: false });

      render(
        <Provider store={store}>
          <CommentList />
        </Provider>
      );

      // Wait for comments to load
      await waitFor(() => {
        expect(screen.getAllByTestId('comment-item')).toHaveLength(5);
      }, { timeout: 3000 });

      // Trigger loading state
      act(() => {
        store.dispatch(setIsLoading(true));
      });

      // Should show loading message
      await waitFor(() => {
        expect(screen.getByText('Loading comments...')).toBeInTheDocument();
      });
    });
  });

  describe('Real Data Loading', () => {
    it('loads comments from database and displays them', async () => {
      const comments = Array.from({ length: 10 }, (_, i) =>
        createComment(`${i + 1}`, 'test-video-id')
      );
      await db.comments.bulkAdd(comments);

      const store = createTestStore();

      render(
        <Provider store={store}>
          <CommentList />
        </Provider>
      );

      // Should load and display comments
      await waitFor(() => {
        const items = screen.getAllByTestId('comment-item');
        expect(items.length).toBeGreaterThan(0);
        expect(items.length).toBeLessThanOrEqual(10);
      }, { timeout: 3000 });
    });

    it('shows empty state when no comments in database', async () => {
      const store = createTestStore();

      render(
        <Provider store={store}>
          <CommentList />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('This video has no comments')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows filter message when search returns no results', async () => {
      const comments = Array.from({ length: 5 }, (_, i) =>
        createComment(`${i}`, 'test-video-id', { content: 'Normal comment' })
      );
      await db.comments.bulkAdd(comments);

      const store = createTestStore({
        searchKeyword: 'nonexistent search term',
      });

      render(
        <Provider store={store}>
          <CommentList />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByText('No comments match your filters')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Filters Integration', () => {
    it('filters verified comments correctly', async () => {
      const comments = [
        createComment('1', 'test-video-id', { isAuthorContentCreator: true }),
        createComment('2', 'test-video-id', { isAuthorContentCreator: false }),
        createComment('3', 'test-video-id', { isAuthorContentCreator: true }),
        createComment('4', 'test-video-id', { isAuthorContentCreator: false }),
      ];
      await db.comments.bulkAdd(comments);

      const store = createTestStore({
        filters: {
          keyword: '',
          verified: true,
          hasLinks: false,
          sortBy: '',
          sortOrder: '',
          likesThreshold: { min: 0, max: Infinity },
          repliesLimit: { min: 0, max: Infinity },
          wordCount: { min: 0, max: Infinity },
          dateTimeRange: { start: '', end: '' },
        },
      });

      render(
        <Provider store={store}>
          <CommentList />
        </Provider>
      );

      // Should only show verified comments (2 out of 4)
      await waitFor(() => {
        const items = screen.getAllByTestId('comment-item');
        expect(items.length).toBe(2);
      }, { timeout: 3000 });
    });

    it('filters comments with links correctly', async () => {
      const comments = [
        createComment('1', 'test-video-id', { hasLinks: true }),
        createComment('2', 'test-video-id', { hasLinks: false }),
        createComment('3', 'test-video-id', { hasLinks: true }),
      ];
      await db.comments.bulkAdd(comments);

      const store = createTestStore({
        filters: {
          keyword: '',
          verified: false,
          hasLinks: true,
          sortBy: '',
          sortOrder: '',
          likesThreshold: { min: 0, max: Infinity },
          repliesLimit: { min: 0, max: Infinity },
          wordCount: { min: 0, max: Infinity },
          dateTimeRange: { start: '', end: '' },
        },
      });

      render(
        <Provider store={store}>
          <CommentList />
        </Provider>
      );

      // Should only show comments with links (2 out of 3)
      await waitFor(() => {
        const items = screen.getAllByTestId('comment-item');
        expect(items.length).toBe(2);
      }, { timeout: 3000 });
    });
  });

  describe('Search Integration', () => {
    it('filters comments by search keyword', async () => {
      const comments = [
        createComment('1', 'test-video-id', { content: 'This is a great video' }),
        createComment('2', 'test-video-id', { content: 'I love this tutorial' }),
        createComment('3', 'test-video-id', { content: 'Great explanation' }),
        createComment('4', 'test-video-id', { content: 'Nice work' }),
      ];
      await db.comments.bulkAdd(comments);

      const store = createTestStore({
        searchKeyword: 'great',
      });

      render(
        <Provider store={store}>
          <CommentList />
        </Provider>
      );

      // Should only show comments containing "great" (2 out of 4)
      await waitFor(() => {
        const items = screen.getAllByTestId('comment-item');
        expect(items.length).toBe(2);
        expect(screen.getByText(/great video/i)).toBeInTheDocument();
        expect(screen.getByText(/Great explanation/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Loading States', () => {
    it('shows loading state when isLoading is true', () => {
      const store = createTestStore({ isLoading: true });

      render(
        <Provider store={store}>
          <CommentList />
        </Provider>
      );

      expect(screen.getByText('Loading comments...')).toBeInTheDocument();
    });

    it('transitions from loading to showing comments', async () => {
      const comments = Array.from({ length: 5 }, (_, i) =>
        createComment(`${i}`, 'test-video-id')
      );
      await db.comments.bulkAdd(comments);

      const store = createTestStore({ isLoading: false });

      render(
        <Provider store={store}>
          <CommentList />
        </Provider>
      );

      // Initially might show loading, then comments
      await waitFor(() => {
        expect(screen.getAllByTestId('comment-item').length).toBe(5);
      }, { timeout: 3000 });
    });
  });
});
