import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import CommentList from './CommentList';
import { useCommentsFromDB } from '../hooks/useCommentsFromDB';

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

// Mock AutoSizer to render children with fixed dimensions
vi.mock('react-virtualized-auto-sizer', () => ({
  AutoSizer: ({ children, renderProp }: any) => {
    const render = children || renderProp;
    return render ? render({ height: 500, width: 500 }) : null;
  },
}));

// Mock react-window VariableSizeList
vi.mock('react-window', () => ({
  VariableSizeList: ({ children, itemCount }: any) => (
    <div data-testid="virtual-list">
      {Array.from({ length: itemCount }).map((_, index) => (
        <div key={index}>{children({ index, style: {} })}</div>
      ))}
    </div>
  ),
}));

// Mock CommentItem
vi.mock('./CommentItem', () => ({
  default: ({ comment }: any) => <div data-testid="comment-item">{comment.content}</div>,
}));

const createMockStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      filters: (state = {}) => state,
      searchKeyword: (state = '') => state,
      ...preloadedState,
    },
    preloadedState: {
      filters: {},
      searchKeyword: '',
      ...preloadedState,
    },
  });
};

describe('CommentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    (useCommentsFromDB as any).mockReturnValue({
      comments: [],
      totalCount: 0,
      isLoading: true,
      hasMore: false,
      loadMore: vi.fn(),
    });

    const store = createMockStore();
    render(
      <Provider store={store}>
        <CommentList />
      </Provider>
    );

    expect(screen.getByText('Loading comments...')).toBeInTheDocument();
  });

  it('renders no comments state', () => {
    (useCommentsFromDB as any).mockReturnValue({
      comments: [],
      totalCount: 0,
      isLoading: false,
      hasMore: false,
      loadMore: vi.fn(),
    });

    const store = createMockStore();
    render(
      <Provider store={store}>
        <CommentList />
      </Provider>
    );

    expect(
      screen.getByText('No comments found. Try a different search or filter.')
    ).toBeInTheDocument();
  });

  it('renders list of comments', () => {
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

    const store = createMockStore();
    render(
      <Provider store={store}>
        <CommentList />
      </Provider>
    );

    // AutoSizer mock renders children, List mock renders items
    expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    expect(screen.getAllByTestId('comment-item')).toHaveLength(2);
    expect(screen.getByText('First comment')).toBeInTheDocument();
    expect(screen.getByText('Second comment')).toBeInTheDocument();
  });

  it('renders load more button when hasMore is true', () => {
    const mockComments = [{ commentId: '1', content: 'First comment', replyCount: 0 }];

    (useCommentsFromDB as any).mockReturnValue({
      comments: mockComments,
      totalCount: 5,
      isLoading: false,
      hasMore: true,
      loadMore: vi.fn(),
    });

    const store = createMockStore();
    render(
      <Provider store={store}>
        <CommentList />
      </Provider>
    );

    // Should have 1 comment + load more button
    expect(screen.getByText('Load More Comments (4 remaining)')).toBeInTheDocument();
  });

  it('renders error alert when error is present', () => {
    (useCommentsFromDB as any).mockReturnValue({
      comments: [],
      totalCount: 0,
      isLoading: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: new Error('Test error message'),
      clearError: vi.fn(),
    });

    const store = createMockStore();
    render(
      <Provider store={store}>
        <CommentList />
      </Provider>
    );

    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders error when loadMore fails (pagination issue)', () => {
    (useCommentsFromDB as any).mockReturnValue({
      comments: [{ commentId: '1', content: 'test' }],
      totalCount: 5,
      isLoading: false,
      hasMore: true,
      loadMore: vi.fn(),
      error: new Error('Unable to load more comments. The database might be empty or out of sync.'),
      clearError: vi.fn(),
    });

    const store = createMockStore();
    render(
      <Provider store={store}>
        <CommentList />
      </Provider>
    );

    expect(
      screen.getByText('Unable to load more comments. The database might be empty or out of sync.')
    ).toBeInTheDocument();
  });
});
