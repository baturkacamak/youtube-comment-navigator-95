import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import LiveChatList from './LiveChatList';
import { setLiveChat } from '../../../store/store';
import { extractVideoId } from '../services/remote/utils';

// Mock dependencies
jest.mock('../services/remote/utils');
jest.mock('../services/liveChat/fetchLiveChat', () => ({
  fetchAndProcessLiveChat: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../shared/utils/logger');
jest.mock('../services/pagination', () => ({
  loadPagedComments: jest.fn().mockResolvedValue([]),
}));
jest.mock('../../shared/utils/database/database', () => ({
  db: {
    comments: {},
  },
}));

// Mock the store
const mockReducer = (state = { liveChat: [] }, action: any) => {
  switch (action.type) {
    case 'comments/setLiveChat':
      return { ...state, liveChat: action.payload };
    default:
      return state;
  }
};

const createMockStore = (initialState = { liveChat: [] }) => {
  return configureStore({
    reducer: mockReducer,
    preloadedState: initialState,
  });
};

describe('LiveChatList', () => {
  beforeEach(() => {
    (extractVideoId as jest.Mock).mockReturnValue('test-video-id');
  });

  it('renders loading state initially', () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <LiveChatList />
      </Provider>
    );

    expect(screen.getByText('Loading chat...')).toBeInTheDocument();
  });

  it('renders no chat message when empty and not loading', async () => {
    const store = createMockStore();
    render(
      <Provider store={store}>
        <LiveChatList />
      </Provider>
    );

    // Wait for async fetch (simulated)
    // Since we mocked loadPagedComments to return [], setLiveChat will be called with []
    // But we need to wait for the state update.
    
    // Actually, in the component, isLoading is set to false in finally block.
    // We need to wait for that.
    
    expect(await screen.findByText('No live chat replay available or loading...')).toBeInTheDocument();
  });
});
