import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdvancedFilters from '../sidebar/components/AdvancedFilters';
import CommentList from './components/CommentList';
import { commentsReducer } from '../../store/store';
import { db } from '../shared/utils/database/database';
import { Comment } from '../../types/commentTypes';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../shared/utils/extractYouTubeVideoIdFromUrl', () => ({
  extractYouTubeVideoIdFromUrl: vi.fn(() => 'test-video-id'),
}));

vi.mock('react-virtualized-auto-sizer', () => ({
  AutoSizer: ({ children, renderProp }: { children?: unknown; renderProp?: unknown }) => {
    const render = (children || renderProp) as
      | ((args: { height: number; width: number }) => JSX.Element)
      | undefined;
    return render ? render({ height: 700, width: 700 }) : null;
  },
}));

vi.mock('react-window', () => ({
  VariableSizeList: React.forwardRef(function MockList(
    {
      children,
      itemCount,
    }: {
      children: ({ index, style }: { index: number; style: React.CSSProperties }) => JSX.Element;
      itemCount: number;
    },
    ref: React.ForwardedRef<{ resetAfterIndex: () => void; scrollToItem: () => void }>
  ) {
    if (ref && typeof ref !== 'function') {
      ref.current = {
        resetAfterIndex: vi.fn(),
        scrollToItem: vi.fn(),
      };
    }

    return (
      <div data-testid="virtual-list">
        {Array.from({ length: Math.min(itemCount, 20) }).map((_, index) => (
          <div key={index}>{children({ index, style: {} })}</div>
        ))}
      </div>
    );
  }),
}));

vi.mock('./components/CommentItem', () => ({
  default: ({ comment }: { comment: Comment }) => (
    <div data-testid="comment-item">{comment.content}</div>
  ),
}));

const createComment = (
  id: string,
  overrides: Partial<Comment> = {},
  publishedDate: string = '2026-01-01T10:00:00Z'
): Comment => {
  const numericId = parseInt(id.replace(/[^0-9]/g, ''), 10) || 1;
  return {
    author: `Author ${id}`,
    likes: numericId * 10,
    viewLikes: `${numericId * 10}`,
    content: `Comment ${id}`,
    published: '1 day ago',
    publishedDate: Date.parse(publishedDate),
    authorAvatarUrl: '',
    isAuthorContentCreator: false,
    authorChannelId: `channel-${id}`,
    replyCount: 0,
    commentId: id,
    replyLevel: 0,
    isDonated: false,
    isHearted: false,
    isMember: false,
    hasTimestamp: false,
    hasLinks: false,
    videoId: 'test-video-id',
    isBookmarked: false,
    bookmarkAddedDate: '',
    wordCount: 3,
    ...overrides,
  };
};

const createTestStore = () =>
  configureStore({
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
    },
  });

describe('AdvancedFilters + CommentList Integration', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('applies likes threshold from UI to DB-backed comment list', async () => {
    await db.comments.bulkAdd([
      createComment('1', { content: 'Low likes', likes: 5 }),
      createComment('2', { content: 'Middle likes', likes: 20 }),
      createComment('3', { content: 'High likes', likes: 40 }),
    ]);

    const store = createTestStore();
    const { container } = render(
      <Provider store={store}>
        <AdvancedFilters />
        <CommentList />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('comment-item')).toHaveLength(3);
    });

    const numberInputs = Array.from(
      container.querySelectorAll('input[type="number"]')
    ) as HTMLInputElement[];
    fireEvent.change(numberInputs[0], { target: { value: '10' } }); // likes min
    fireEvent.change(numberInputs[1], { target: { value: '30' } }); // likes max

    await waitFor(
      () => {
        expect(screen.getAllByTestId('comment-item')).toHaveLength(1);
        expect(screen.getByText('Middle likes')).toBeInTheDocument();
      },
      { timeout: 4000 }
    );
  });

  it('applies word-count and date-range filters from UI', async () => {
    await db.comments.bulkAdd([
      createComment('1', { content: 'Too short', wordCount: 2 }, '2026-01-01T10:00:00Z'),
      createComment('2', { content: 'Target comment', wordCount: 4 }, '2026-01-03T10:00:00Z'),
      createComment('3', { content: 'Too long', wordCount: 7 }, '2026-01-03T10:00:00Z'),
    ]);

    const store = createTestStore();
    const { container } = render(
      <Provider store={store}>
        <AdvancedFilters />
        <CommentList />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('comment-item')).toHaveLength(3);
    });

    const numberInputs = Array.from(
      container.querySelectorAll('input[type="number"]')
    ) as HTMLInputElement[];
    fireEvent.change(numberInputs[4], { target: { value: '3' } }); // word min
    fireEvent.change(numberInputs[5], { target: { value: '5' } }); // word max

    const datetimeInputs = Array.from(
      container.querySelectorAll('input[type="datetime-local"]')
    ) as HTMLInputElement[];
    fireEvent.change(datetimeInputs[0], { target: { value: '2026-01-02T00:00' } }); // start
    fireEvent.change(datetimeInputs[1], { target: { value: '2026-01-04T23:59' } }); // end

    await waitFor(
      () => {
        expect(screen.getAllByTestId('comment-item')).toHaveLength(1);
        expect(screen.getByText('Target comment')).toBeInTheDocument();
      },
      { timeout: 4000 }
    );
  });

  it('debounces rapid likes updates and applies only the latest value', async () => {
    await db.comments.bulkAdd([
      createComment('1', { content: 'Likes 10', likes: 10 }),
      createComment('2', { content: 'Likes 20', likes: 20 }),
      createComment('3', { content: 'Likes 30', likes: 30 }),
    ]);

    const store = createTestStore();
    const { container } = render(
      <Provider store={store}>
        <AdvancedFilters />
        <CommentList />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('comment-item')).toHaveLength(3);
    });

    vi.useFakeTimers();

    const numberInputs = Array.from(
      container.querySelectorAll('input[type="number"]')
    ) as HTMLInputElement[];
    fireEvent.change(numberInputs[0], { target: { value: '5' } });
    fireEvent.change(numberInputs[0], { target: { value: '15' } });
    fireEvent.change(numberInputs[0], { target: { value: '25' } });

    expect(store.getState().filters.likesThreshold.min).toBe(0);

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(store.getState().filters.likesThreshold.min).toBe(0);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(store.getState().filters.likesThreshold.min).toBe(25);

    vi.useRealTimers();

    await waitFor(
      () => {
        expect(screen.getAllByTestId('comment-item')).toHaveLength(1);
        expect(screen.getByText('Likes 30')).toBeInTheDocument();
      },
      { timeout: 4000 }
    );
  });
});
