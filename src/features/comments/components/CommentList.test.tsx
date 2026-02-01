import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import CommentList from './CommentList';
import { useCommentsFromDB } from '../hooks/useCommentsFromDB';
import logger from '../../shared/utils/logger';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options && options.remaining !== undefined) {
        return key.replace('{{remaining}}', options.remaining);
      }
      return key;
    },
  }),
}));

vi.mock('../../shared/utils/extractYouTubeVideoIdFromUrl', () => ({
  extractYouTubeVideoIdFromUrl: vi.fn().mockReturnValue('test-video-id'),
}));

vi.mock('../hooks/useCommentsFromDB');

// Mock logger to verify error logging
vi.mock('../../shared/utils/logger', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() { /* no-op */ }
  unobserve() { /* no-op */ }
  disconnect() { /* no-op */ }
} as any;

// Helper to update AutoSizer mock dimensions
let autoSizerHeight = 500;
let autoSizerWidth = 500;

// Mock AutoSizer to render children with dynamic dimensions
vi.mock('react-virtualized-auto-sizer', () => ({
  AutoSizer: ({ children, renderProp }: any) => {
    const render = children || renderProp;
    return render ? render({ height: autoSizerHeight, width: autoSizerWidth }) : null;
  },
}));

// Mock react-window VariableSizeList
// We capture the onItemsRendered callback to simulate scrolling
let lastOnItemsRendered: any = null;
let lastItemSize: any = null;

vi.mock('react-window', () => ({
  VariableSizeList: React.forwardRef(function MockVariableSizeList(
    { children, itemCount, onItemsRendered, itemSize }: any,
    ref: any
  ) {
    lastOnItemsRendered = onItemsRendered;
    lastItemSize = itemSize;

    // Expose mock methods via ref
    if (ref) {
      ref.current = {
        resetAfterIndex: vi.fn(),
        scrollToItem: vi.fn(),
      };
    }

    return (
      <div data-testid="virtual-list">
        {Array.from({ length: itemCount }).map((_, index) => (
          <div key={index}>{children({ index, style: { /* no-op */ } })}</div>
        ))}
      </div>
    );
  }),
}));

// Mock CommentItem
vi.mock('./CommentItem', () => ({
  default: ({ comment }: any) => <div data-testid="comment-item">{comment.content}</div>,
}));

const createMockStore = (preloadedState = { /* no-op */ }) => {
  return configureStore({
    reducer: {
      filters: (state = { /* no-op */ }) => state,
      searchKeyword: (state = '') => state,
      // Add other reducers if needed by useSelector
    },
    preloadedState: {
      filters: { /* no-op */ },
      searchKeyword: '',
      ...preloadedState,
    },
  });
};

describe('CommentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    autoSizerHeight = 500;
    autoSizerWidth = 500;
    lastOnItemsRendered = null;
    lastItemSize = null;
  });

  describe('Loading and Empty States', () => {
    it('renders loading state initially', () => {
      (useCommentsFromDB as any).mockReturnValue({
        comments: [],
        totalCount: 0,
        isLoading: true,
        hasMore: false,
        loadMore: vi.fn(),
      });

      render(
        <Provider store={createMockStore()}>
          <CommentList />
        </Provider>
      );

      expect(screen.getByText('Loading comments...')).toBeInTheDocument();
    });

    it('renders "This video has no comments" when empty and no filters', () => {
      (useCommentsFromDB as any).mockReturnValue({
        comments: [],
        totalCount: 0,
        isLoading: false,
        hasMore: false,
        loadMore: vi.fn(),
      });

      render(
        <Provider store={createMockStore()}>
          <CommentList />
        </Provider>
      );

      expect(screen.getByText('This video has no comments')).toBeInTheDocument();
    });

    it('renders "No comments match your filters" when empty with search keyword', () => {
      (useCommentsFromDB as any).mockReturnValue({
        comments: [],
        totalCount: 0,
        isLoading: false,
        hasMore: false,
        loadMore: vi.fn(),
      });

      render(
        <Provider store={createMockStore({ searchKeyword: 'something' })}>
          <CommentList />
        </Provider>
      );

      expect(screen.getByText('No comments match your filters')).toBeInTheDocument();
      expect(screen.getByText('Clear filters')).toBeInTheDocument();
    });

    it('renders "No comments match your filters" when empty with verified filter', () => {
      (useCommentsFromDB as any).mockReturnValue({
        comments: [],
        totalCount: 0,
        isLoading: false,
        hasMore: false,
        loadMore: vi.fn(),
      });

      render(
        <Provider store={createMockStore({ filters: { verified: true } })}>
          <CommentList />
        </Provider>
      );

      expect(screen.getByText('No comments match your filters')).toBeInTheDocument();
    });
  });

  describe('Rendering Comments', () => {
    it('renders list of comments correctly', () => {
      const mockComments = [
        { commentId: '1', content: 'First comment', replyCount: 0 },
        { commentId: '2', content: 'Second comment', replyCount: 0 },
      ];

      (useCommentsFromDB as any).mockReturnValue({
        comments: mockComments,
        totalCount: 2,
        isLoading: false,
        hasMore: false,
        loadMore: vi.fn(),
      });

      render(
        <Provider store={createMockStore()}>
          <CommentList />
        </Provider>
      );

      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
      expect(screen.getAllByTestId('comment-item')).toHaveLength(2);
      expect(screen.getByText('First comment')).toBeInTheDocument();
      expect(screen.getByText('Second comment')).toBeInTheDocument();
    });

    it('renders loading indicator as the last item when hasMore is true', () => {
      const mockComments = [{ commentId: '1', content: 'First comment', replyCount: 0 }];

      (useCommentsFromDB as any).mockReturnValue({
        comments: mockComments,
        totalCount: 5,
        isLoading: false,
        hasMore: true,
        loadMore: vi.fn(),
      });

      render(
        <Provider store={createMockStore()}>
          <CommentList />
        </Provider>
      );

      expect(screen.getByText('Loading more comments...')).toBeInTheDocument();
      // 1 comment + 1 loader
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
      // The loader is not wrapped in MeasuredCommentItem/listitem role in the mock maybe?
      // Checking the code: loader is a div with style, not role="listitem".
      // Let's check text content.
    });
  });

  describe('Error Handling', () => {
    it('renders general error alert when error is present and no comments', () => {
      const mockClearError = vi.fn();
      const mockRefresh = vi.fn();

      (useCommentsFromDB as any).mockReturnValue({
        comments: [],
        totalCount: 0,
        isLoading: false,
        hasMore: false,
        loadMore: vi.fn(),
        error: new Error('Network error'),
        clearError: mockClearError,
        refresh: mockRefresh,
      });

      render(
        <Provider store={createMockStore()}>
          <CommentList />
        </Provider>
      );

      expect(screen.getByText('Failed to load comments')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();

      const retryBtn = screen.getByText('Retry');
      fireEvent.click(retryBtn);

      expect(mockClearError).toHaveBeenCalled();
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('renders inline error alert when error is present WITH comments', () => {
      const mockClearError = vi.fn();
      const mockRefresh = vi.fn();

      (useCommentsFromDB as any).mockReturnValue({
        comments: [{ commentId: '1', content: 'Existing comment' }],
        totalCount: 1,
        isLoading: false,
        hasMore: false,
        loadMore: vi.fn(),
        error: new Error('Background sync failed'),
        clearError: mockClearError,
        refresh: mockRefresh,
      });

      render(
        <Provider store={createMockStore()}>
          <CommentList />
        </Provider>
      );

      // Existing comments should still be visible
      expect(screen.getByText('Existing comment')).toBeInTheDocument();
      // Error should be visible at the top
      expect(screen.getByText('Background sync failed')).toBeInTheDocument();

      const retryBtn = screen.getByText('Retry');
      fireEvent.click(retryBtn);

      expect(mockClearError).toHaveBeenCalled();
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('Infinite Scroll & Pagination', () => {
    it('triggers loadMore when scrolling near the end', () => {
      const mockLoadMore = vi.fn();
      const mockComments = Array.from({ length: 20 }).map((_, i) => ({
        commentId: `${i}`,
        content: `Comment ${i}`,
        replyCount: 0,
      }));

      (useCommentsFromDB as any).mockReturnValue({
        comments: mockComments,
        totalCount: 100,
        isLoading: false,
        hasMore: true,
        loadMore: mockLoadMore,
      });

      render(
        <Provider store={createMockStore()}>
          <CommentList />
        </Provider>
      );

      // Simulate scrolling to the end
      // handleItemsRendered({ visibleStopIndex })
      // logic: if (hasMore && !isLoading && visibleStopIndex >= comments.length - 5)

      // Simulate rendering up to index 16 (length 20, so 20-5=15. 16 >= 15 should trigger)
      act(() => {
        if (lastOnItemsRendered) {
          lastOnItemsRendered({ visibleStopIndex: 16 });
        }
      });

      expect(mockLoadMore).toHaveBeenCalled();
    });

    it('does NOT trigger loadMore if already loading', () => {
      const mockLoadMore = vi.fn();

      (useCommentsFromDB as any).mockReturnValue({
        comments: Array.from({ length: 20 }).map((_, i) => ({
          commentId: `${i}`,
          content: `Comment ${i}`,
          replyCount: 0,
        })),
        totalCount: 100,
        isLoading: true, // Already loading
        hasMore: true,
        loadMore: mockLoadMore,
      });

      render(
        <Provider store={createMockStore()}>
          <CommentList />
        </Provider>
      );

      act(() => {
        if (lastOnItemsRendered) {
          lastOnItemsRendered({ visibleStopIndex: 18 });
        }
      });

      expect(mockLoadMore).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases & Layout', () => {
    it('handles AutoSizer zero dimensions gracefully by rendering fallback', () => {
      autoSizerHeight = 0;
      autoSizerWidth = 0;

      (useCommentsFromDB as any).mockReturnValue({
        comments: [{ commentId: '1', content: 'test' }],
        totalCount: 1,
        isLoading: false,
        hasMore: false,
      });

      render(
        <Provider store={createMockStore()}>
          <CommentList />
        </Provider>
      );

      // Should log warning
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('AutoSizer returned 0 dimensions')
      );

      // Should still render the list (fallback)
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });

    it('detects layout loop (excessive height)', () => {
      autoSizerHeight = 60000; // > 50000 limit

      (useCommentsFromDB as any).mockReturnValue({
        comments: [{ commentId: '1', content: 'test' }],
        totalCount: 1,
        isLoading: false,
        hasMore: false,
      });

      render(
        <Provider store={createMockStore()}>
          <CommentList />
        </Provider>
      );

      expect(screen.getByText(/Error: Layout loop detected/)).toBeInTheDocument();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Layout loop detected'),
        60000
      );
    });

    it('estimates row height based on content length', () => {
      const longContent = 'a'.repeat(200); // Should trigger > 1 line
      const shortContent = 'short';

      const mockComments = [
        { commentId: '1', content: shortContent, replyCount: 0 },
        { commentId: '2', content: longContent, replyCount: 5 }, // Has replies
      ];

      (useCommentsFromDB as any).mockReturnValue({
        comments: mockComments,
        totalCount: 2,
        isLoading: false,
        hasMore: false,
      });

      render(
        <Provider store={createMockStore()}>
          <CommentList />
        </Provider>
      );

      // Verify itemSize callback logic via our mock capture
      expect(lastItemSize).toBeDefined();

      // Index 0: Short content, no replies
      // estimateRowHeight = BASE_ROW_HEIGHT (120) + 0 extra + 0 replies
      const height0 = lastItemSize(0);
      expect(height0).toBe(120);

      // Index 1: Long content (200 chars), 5 replies
      // 200 / 80 = 2.5 -> 3 lines
      // extraHeight = (3 - 2) * 20 = 20
      // hasReplies = 30
      // Total = 120 + 20 + 30 = 170
      const height1 = lastItemSize(1);
      expect(height1).toBe(170);
    });

    it('returns fixed height for load more indicator (last item)', () => {
      const mockComments = [{ commentId: '1', content: 'test', replyCount: 0 }];

      (useCommentsFromDB as any).mockReturnValue({
        comments: mockComments,
        totalCount: 5,
        isLoading: false,
        hasMore: true, // Has more items
      });

      render(
        <Provider store={createMockStore()}>
          <CommentList />
        </Provider>
      );

      // Item at index 1 is the loader (comments.length)
      const loaderHeight = lastItemSize(1);
      expect(loaderHeight).toBe(60);
    });
  });
});
