import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import VideoCommentMonitorControl from './VideoCommentMonitorControl';
import { YOUTUBE_DATA_API_KEY_STORAGE } from '../../shared/services/youtubeDataApi';

const translate = (key: string, values?: Record<string, unknown>) =>
  key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(values?.[name] ?? ''));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: translate,
  }),
}));

type RuntimeResponse = {
  monitored: boolean;
  apiKeyConfigured: boolean;
  lastCheckedAt: number | null;
  nextCheckAt: number | null;
  intervalMinutes: number | null;
  lastKnownCount: number;
  lastKnownTotalCommentCount: number | null;
  lastError: string | null;
};

const baseStatus: RuntimeResponse = {
  monitored: false,
  apiKeyConfigured: false,
  lastCheckedAt: null,
  nextCheckAt: null,
  intervalMinutes: null,
  lastKnownCount: 0,
  lastKnownTotalCommentCount: null,
  lastError: null,
};

const sendMessageMock = vi.fn();
const addStorageListenerMock = vi.fn();
const removeStorageListenerMock = vi.fn();
let storageChangeListener:
  | ((changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void)
  | null = null;

const setChromeMock = () => {
  (globalThis as unknown as { chrome: unknown }).chrome = {
    runtime: {
      sendMessage: sendMessageMock,
      lastError: undefined,
    },
    storage: {
      onChanged: {
        addListener: addStorageListenerMock.mockImplementation((listener) => {
          storageChangeListener = listener;
        }),
        removeListener: removeStorageListenerMock,
      },
    },
  };
};

const renderWithStatus = async (status: RuntimeResponse) => {
  sendMessageMock.mockImplementation(
    (message: { type?: string }, callback: (value: unknown) => void) => {
      if (message.type === 'YCN_COMMENT_MONITOR_STATUS') {
        callback(status);
        return;
      }

      callback(status);
    }
  );

  render(<VideoCommentMonitorControl videoId="video-1" />);
  await waitFor(() => expect(sendMessageMock).toHaveBeenCalled());
  fireEvent.click(await screen.findByRole('button', { name: 'Background comment alerts' }));
};

describe('VideoCommentMonitorControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageChangeListener = null;
    setChromeMock();
  });

  it('shows the missing-key follow state when no key and no monitor exist', async () => {
    await renderWithStatus(baseStatus);

    expect(
      screen.getByText('Add a YouTube Data API key in Settings before following videos.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Follow this video' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check now' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Stop following this video' })
    ).not.toBeInTheDocument();
  });

  it('shows a ready state when a key exists but the video is not followed', async () => {
    await renderWithStatus({ ...baseStatus, apiKeyConfigured: true });

    expect(
      screen.getByText('Ready to follow this video. New comment alerts will appear here.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Follow this video' })).toBeInTheDocument();
    expect(
      screen.queryByText('Requires a YouTube Data API key in Settings.')
    ).not.toBeInTheDocument();
  });

  it('shows stop and check actions when monitoring is active', async () => {
    await renderWithStatus({
      ...baseStatus,
      monitored: true,
      apiKeyConfigured: true,
      lastCheckedAt: 1785000000000,
      nextCheckAt: 1785043200000,
      intervalMinutes: 720,
      lastKnownCount: 100,
      lastKnownTotalCommentCount: 200,
    });

    expect(screen.getByRole('button', { name: 'Stop following this video' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check now' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Follow this video' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Monitoring is paused/i)).not.toBeInTheDocument();
  });

  it('shows a paused state when a followed video has no key', async () => {
    await renderWithStatus({
      ...baseStatus,
      monitored: true,
      apiKeyConfigured: false,
      lastCheckedAt: 1785000000000,
      nextCheckAt: 1785043200000,
      intervalMinutes: 720,
      lastKnownCount: 100,
    });

    expect(screen.getByText(/Monitoring is paused/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop following this video' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check now' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Follow this video' })).not.toBeInTheDocument();
  });

  it('refreshes a paused followed video when the Data API key is added', async () => {
    const pausedStatus = {
      ...baseStatus,
      monitored: true,
      apiKeyConfigured: false,
      lastCheckedAt: 1785000000000,
      nextCheckAt: 1785043200000,
      intervalMinutes: 720,
      lastKnownCount: 100,
      lastError: 'Background monitoring requires a YouTube Data API key.',
    };
    const activeStatus = {
      ...pausedStatus,
      apiKeyConfigured: true,
      lastError: null,
      lastKnownTotalCommentCount: 200,
    };

    sendMessageMock.mockImplementation(
      (message: { type?: string }, callback: (value: unknown) => void) => {
        callback(sendMessageMock.mock.calls.length <= 1 ? pausedStatus : activeStatus);
      }
    );

    render(<VideoCommentMonitorControl videoId="video-1" />);
    await waitFor(() => expect(sendMessageMock).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole('button', { name: 'Background comment alerts' }));

    expect(screen.getByText(/Monitoring is paused/i)).toBeInTheDocument();

    storageChangeListener?.(
      {
        [YOUTUBE_DATA_API_KEY_STORAGE]: {
          oldValue: '',
          newValue: 'configured',
        },
      },
      'local'
    );

    await waitFor(() => expect(sendMessageMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByText(/Monitoring is paused/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check now' })).toBeInTheDocument();
  });

  it('keeps the video unfollowed and shows a single settings prompt when follow is clicked without a key', async () => {
    const missingKeyResponse = {
      ...baseStatus,
      lastError: 'Background monitoring requires a YouTube Data API key.',
    };
    sendMessageMock.mockImplementation(
      (message: { type?: string }, callback: (value: unknown) => void) => {
        callback(message.type === 'YCN_COMMENT_MONITOR_ENABLE' ? missingKeyResponse : baseStatus);
      }
    );

    render(<VideoCommentMonitorControl videoId="video-1" />);
    await waitFor(() => expect(sendMessageMock).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole('button', { name: 'Background comment alerts' }));
    fireEvent.click(screen.getByRole('button', { name: 'Follow this video' }));

    await waitFor(() =>
      expect(
        screen.getAllByText('Add a YouTube Data API key in Settings to follow videos.')
      ).toHaveLength(1)
    );
    expect(screen.getByRole('button', { name: 'Follow this video' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Stop following this video' })
    ).not.toBeInTheDocument();
  });
});
