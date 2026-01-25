import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import LiveChatList from './LiveChatList';
import { setLiveChat } from '../../../store/store';
import { extractVideoId } from '../services/remote/utils';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../services/remote/utils');
vi.mock('../services/liveChat/fetchLiveChat', () => ({
  fetchAndProcessLiveChat: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../shared/utils/logger');
vi.mock('../services/liveChat/liveChatDatabase', () => ({
  loadLiveChatMessages: vi.fn().mockResolvedValue([]),
  getLiveChatMessageCount: vi.fn().mockResolvedValue(0),
  hasLiveChatMessages: vi.fn().mockResolvedValue(false),
}));
vi.mock('../../shared/utils/database/database', () => ({
  db: {
    comments: {},
  },
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
  searchKeyword: ''
};

const mockReducer = (state = initialState, action: any) => {
  switch (action.type) {
    case 'comments/setLiveChat':
      return { ...state, liveChat: action.payload };
    case 'comments/setLiveChatLoading':
        return { ...state, liveChatState: { ...state.liveChatState, isLoading: action.payload } };
    case 'comments/setLiveChatError':
        return { ...state, liveChatState: { ...state.liveChatState, error: action.payload } };
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
    (extractVideoId as unknown as ReturnType<typeof vi.fn>).mockReturnValue('test-video-id');
  });

  it('renders loading state initially', () => {
    const store = createMockStore({
        liveChatState: { isLoading: true, error: null, messageCount: 0 }
    });
    render(
      <Provider store={store}>
        <LiveChatList />
      </Provider>
    );

    expect(screen.getByText('Loading live chat transcript...')).toBeInTheDocument();
  });

  it('renders no chat message when empty and not loading', async () => {
    const store = createMockStore({
        liveChatState: { isLoading: false, error: null, messageCount: 0 }
    });
    render(
      <Provider store={store}>
        <LiveChatList />
      </Provider>
    );

    expect(await screen.findByText('No live chat messages')).toBeInTheDocument();
  });
});
