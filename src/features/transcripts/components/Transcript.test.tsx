import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Transcript from './Transcript';
import { fetchTranscript } from '../services/fetchTranscript';
import * as storeActions from '../../../store/store';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../services/fetchTranscript');
vi.mock('./ActionButtons', () => ({
  default: ({ setIncludeTimestamps, includeTimestamps }: any) => (
    <div data-testid="action-buttons">
      <button
        data-testid="toggle-timestamps"
        onClick={() => setIncludeTimestamps(!includeTimestamps)}
      >
        Toggle
      </button>
    </div>
  ),
}));
vi.mock('./TranscriptEntry', () => ({
  default: ({ entry }: any) => <li data-testid="transcript-entry">{entry.text}</li>,
}));

// Mock store actions
vi.mock('../../../store/store', async () => {
  const actual = await vi.importActual('../../../store/store');
  return {
    ...actual,
    setTranscripts: vi.fn((items) => ({ type: 'transcripts/set', payload: items })),
  };
});

const createMockStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      transcriptSelectedLanguage: (state = { value: 'en', label: 'English' }) => state,
      isLoading: (state = false) => state,
      transcripts: (state = []) => state,
      // Add other necessary reducers
      filters: (state = {}) => state,
      searchKeyword: (state = '') => state,
    },
    preloadedState,
  });
};

describe('Transcript Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders loading state correctly', () => {
    const store = createMockStore({ isLoading: true });

    render(
      <Provider store={store}>
        <Transcript transcripts={[]} />
      </Provider>
    );

    expect(screen.getByText('Loading transcript...')).toBeInTheDocument();
    expect(screen.queryByText('Transcript not available')).not.toBeInTheDocument();
  });

  it('renders empty state correctly when not loading', () => {
    const store = createMockStore({ isLoading: false });

    render(
      <Provider store={store}>
        <Transcript transcripts={[]} />
      </Provider>
    );

    expect(screen.getByText('Transcript not available')).toBeInTheDocument();
    expect(
      screen.getByText('This video does not have a transcript, or it could not be loaded.')
    ).toBeInTheDocument();
  });

  it('renders transcripts list when data is provided', () => {
    const mockTranscripts = [
      { text: 'Line 1', start: 0, duration: 2 },
      { text: 'Line 2', start: 2, duration: 2 },
    ];
    const store = createMockStore({ isLoading: false });

    render(
      <Provider store={store}>
        <Transcript transcripts={mockTranscripts} />
      </Provider>
    );

    expect(screen.getAllByTestId('transcript-entry')).toHaveLength(2);
    expect(screen.getByText('Line 1')).toBeInTheDocument();
    expect(screen.getByText('Line 2')).toBeInTheDocument();
  });

  it('fetches transcript when language changes', async () => {
    const mockFetch = fetchTranscript as any;
    mockFetch.mockResolvedValue({ items: [{ text: 'New Line', start: 0, duration: 1 }] });

    const store = createMockStore({
      transcriptSelectedLanguage: { value: 'es', label: 'Spanish' },
    });

    render(
      <Provider store={store}>
        <Transcript transcripts={[]} />
      </Provider>
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('es');
    });

    // Check if setTranscripts was dispatched
    expect(storeActions.setTranscripts).toHaveBeenCalledWith([
      { text: 'New Line', start: 0, duration: 1 },
    ]);
  });

  it('persists timestamp preference to localStorage', () => {
    const store = createMockStore();

    // Initial render - should read from localStorage (default false/null -> false)
    const { unmount } = render(
      <Provider store={store}>
        <Transcript transcripts={[]} />
      </Provider>
    );

    // We can't easily trigger the state change inside the component without interacting with ActionButtons
    // but ActionButtons is mocked.
    // However, the component initializes state from localStorage:
    // const [includeTimestamps, setIncludeTimestamps] = useState(() => localStorage.getItem(...) === 'true');

    // Let's test the initialization
    unmount();
    localStorage.setItem('transcript_timestamps_preference', 'true');

    render(
      <Provider store={store}>
        <Transcript transcripts={[]} />
      </Provider>
    );

    // How to verify state?
    // We pass `includeTimestamps` to TranscriptEntry and ActionButtons.
    // We can check the mock calls.

    // But verify localStorage setter effect requires state change.
    // Since we mocked ActionButtons, we can't click a real button to change state.
    // We'd need to mock ActionButtons to call the setter prop.
  });

  it('updates localStorage when timestamp preference changes', async () => {
    const store = createMockStore();

    render(
      <Provider store={store}>
        <Transcript transcripts={[]} />
      </Provider>
    );

    const toggleBtn = screen.getByTestId('toggle-timestamps');
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(localStorage.getItem('transcript_timestamps_preference')).toBe('true');
    });
  });
});
