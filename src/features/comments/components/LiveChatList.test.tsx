import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import LiveChatList from './LiveChatList';
import { extractVideoId } from '../services/remote/utils';
import {
  loadLiveChatMessages,
  getLiveChatMessageCount,
} from '../services/liveChat/liveChatDatabase';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../services/remote/utils');
vi.mock('../services/liveChat/fetchLiveChat');
vi.mock('../../shared/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    success: vi.fn(),
  },
}));
vi.mock('../services/liveChat/liveChatDatabase');
vi.mock('../../shared/utils/database/database', () => ({
  db: {
    comments: {},
  },
}));

// Mock child component to isolate test
vi.mock('./LiveChatTranscript', () => ({
  default: ({ messages, isLoading, onLoadMore, hasMore }: any) => (
    <div data-testid="live-chat-transcript">
      {isLoading && <div data-testid="loading">Loading...</div>}
      <div data-testid="messages-count">{messages.length}</div>
      <button data-testid="load-more" onClick={onLoadMore} disabled={!hasMore}>
        Load More
      </button>
    </div>
  ),
}));

// Mock the store
const initialState = {
  liveChat: [],
  liveChatState: {
    isLoading: false,
    error: null,
    messageCount: 0,
    continuationToken: null,
    isReplay: false,
  },
  settings: {
    textSize: 'text-base',
    fontFamily: 'Arial',
  },
  searchKeyword: '',
};

// We need a real reducer to test state updates dispatched by the component
// Ideally we import the real root reducer or slice reducers, but for now we'll simulate the relevant parts
const mockReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case 'comments/setLiveChat':
      return { ...state, liveChat: action.payload };
    case 'comments/appendLiveChat':
      return { ...state, liveChat: [...state.liveChat, ...action.payload] };
    case 'comments/setLiveChatLoading':
      return { ...state, liveChatState: { ...state.liveChatState, isLoading: action.payload } };
    case 'comments/setLiveChatError':
      return { ...state, liveChatState: { ...state.liveChatState, error: action.payload } };
    case 'comments/setLiveChatMessageCount':
      return { ...state, liveChatState: { ...state.liveChatState, messageCount: action.payload } };
    default:
      return state;
  }
};

const createMockStore = (preloadedState = {}) => {
  return configureStore({
    reducer: mockReducer,
    preloadedState: { ...initialState, ...preloadedState },
  });
};

describe('LiveChatList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (extractVideoId as any).mockReturnValue('test-video-id');
  });

  it('fetches messages on mount', async () => {
    const mockMessages = Array.from({ length: 50 }).map((_, i) => ({
      messageId: `${i}`,
      message: 'test',
    }));
    (loadLiveChatMessages as any).mockResolvedValue(mockMessages);
    (getLiveChatMessageCount as any).mockResolvedValue(100);

    const store = createMockStore();
    render(
      <Provider store={store}>
        <LiveChatList />
      </Provider>
    );

    await waitFor(() => {
      expect(loadLiveChatMessages).toHaveBeenCalledWith('test-video-id', 0, 100);
    });

    // Check store update via UI
    expect(screen.getByTestId('messages-count')).toHaveTextContent('50');
  });

  it('handles load more (pagination)', async () => {
    // Initial load
    const page1 = Array.from({ length: 100 }).map((_, i) => ({
      messageId: `p1-${i}`,
      message: 'test',
    }));
    const page2 = Array.from({ length: 50 }).map((_, i) => ({
      messageId: `p2-${i}`,
      message: 'test',
    }));

    (loadLiveChatMessages as any)
      .mockResolvedValueOnce(page1) // First call (mount)
      .mockResolvedValueOnce(page2); // Second call (load more)

    (getLiveChatMessageCount as any).mockResolvedValue(150);

    const store = createMockStore();
    render(
      <Provider store={store}>
        <LiveChatList />
      </Provider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('messages-count')).toHaveTextContent('100');
    });

    // Trigger load more
    const loadMoreBtn = screen.getByTestId('load-more');
    fireEvent.click(loadMoreBtn);

    await waitFor(() => {
      // Offset should be 100 (page 1 * 100)
      expect(loadLiveChatMessages).toHaveBeenCalledWith('test-video-id', 100, 100);
    });

    // Check total messages
    expect(screen.getByTestId('messages-count')).toHaveTextContent('150');
  });

  it('displays error state and handles retry', async () => {
    // Simulate error in store
    const store = createMockStore({
      liveChatState: { isLoading: false, error: 'Network Error', messageCount: 0 },
    });

    render(
      <Provider store={store}>
        <LiveChatList />
      </Provider>
    );

    expect(screen.getByText('Error loading live chat:')).toBeInTheDocument();
    expect(screen.getByText('Network Error')).toBeInTheDocument();

    // Mock fetch for retry
    (loadLiveChatMessages as any).mockResolvedValue([]);
    (getLiveChatMessageCount as any).mockResolvedValue(0);

    const retryBtn = screen.getByText('Retry');
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(loadLiveChatMessages).toHaveBeenCalled();
    });
  });

  it('does not fetch if videoId is missing', () => {
    (extractVideoId as any).mockReturnValue(null);
    const store = createMockStore();

    render(
      <Provider store={store}>
        <LiveChatList />
      </Provider>
    );

    expect(loadLiveChatMessages).not.toHaveBeenCalled();
  });
});
