import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const roots: Array<{
  container: Element;
  root: { render: ReturnType<typeof vi.fn>; unmount: ReturnType<typeof vi.fn> };
}> = [];

const { mockCreateRoot } = vi.hoisted(() => ({
  mockCreateRoot: vi.fn((container: Element) => {
    const root = {
      render: vi.fn(),
      unmount: vi.fn(),
    };
    roots.push({ container, root });
    return root;
  }),
}));

vi.mock('react-dom/client', () => ({
  default: {
    createRoot: mockCreateRoot,
  },
  createRoot: mockCreateRoot,
}));

vi.mock('./App', () => ({
  default: () => null,
}));

vi.mock('./features/batch-export/components/PlaylistBatchExportWidget', () => ({
  default: () => null,
}));

vi.mock('./features/shared/components/ToastContainer', () => ({
  default: () => null,
}));

vi.mock('./features/shared/contexts/ToastContext', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('react-redux', () => ({
  Provider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('./store/store', () => ({
  default: {},
}));

const mockI18nOn = vi.fn();
const mockI18nOff = vi.fn();

vi.mock('./i18n', () => ({
  default: {
    language: 'en',
    on: mockI18nOn,
    off: mockI18nOff,
  },
  getLanguageDirection: vi.fn(() => 'ltr'),
}));

vi.mock('./features/shared/utils/appConstants', () => ({
  isLocalEnvironment: vi.fn(() => false),
  languageOptions: [{ value: 'en' }],
}));

const setUrl = (path: string) => {
  window.history.pushState({}, '', path);
};

describe('content.tsx integration', () => {
  const originalAppendChild = document.head.appendChild;

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.clearAllMocks();
    roots.length = 0;

    // Simulate YouTube watch DOM skeleton.
    document.body.innerHTML = '<div id="app-shell"><div id="comments"></div></div>';

    // Mock chrome APIs used by content script.
    (globalThis as unknown as { chrome: unknown }).chrome = {
      runtime: {
        getURL: (path: string) => `chrome-extension://test/${path}`,
      },
      i18n: {
        getUILanguage: () => 'en-US',
      },
    };

    // Resolve translation fetches.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ mock_key: 'mock_value' }),
      })
    );

    // Force injected scripts to resolve immediately.
    document.head.appendChild = ((node: Node) => {
      const appended = originalAppendChild.call(document.head, node);
      if (node instanceof HTMLScriptElement && typeof node.onload === 'function') {
        node.onload(new Event('load'));
      }
      return appended;
    }) as typeof document.head.appendChild;
  });

  afterEach(() => {
    document.head.appendChild = originalAppendChild;
    vi.unstubAllGlobals();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('switches mount targets correctly across watch, playlist and unsupported URLs', async () => {
    setUrl('/watch?v=video-a&list=PL001');

    await import('./content');
    await vi.advanceTimersByTimeAsync(2500);

    expect(document.getElementById('youtube-comment-navigator-app')).not.toBeNull();
    expect(document.getElementById('youtube-comment-navigator-playlist-batch')).toBeNull();
    expect(mockCreateRoot).toHaveBeenCalledTimes(1);
    expect(roots[0].container.id).toBe('youtube-comment-navigator-app');

    const watchRootFirst = roots[0].root;

    setUrl('/playlist?list=PL001');
    await vi.advanceTimersByTimeAsync(3500);

    expect(watchRootFirst.unmount).toHaveBeenCalledTimes(1);
    expect(document.getElementById('youtube-comment-navigator-app')).toBeNull();
    expect(document.getElementById('youtube-comment-navigator-playlist-batch')).not.toBeNull();
    expect(mockCreateRoot).toHaveBeenCalledTimes(2);
    expect(roots[1].container.id).toBe('youtube-comment-navigator-playlist-batch');

    const playlistRoot = roots[1].root;

    setUrl('/watch?v=video-b&list=PL001');
    await vi.advanceTimersByTimeAsync(3500);

    expect(playlistRoot.unmount).toHaveBeenCalledTimes(1);
    expect(document.getElementById('youtube-comment-navigator-playlist-batch')).toBeNull();
    expect(document.getElementById('youtube-comment-navigator-app')).not.toBeNull();
    expect(mockCreateRoot).toHaveBeenCalledTimes(3);
    expect(roots[2].container.id).toBe('youtube-comment-navigator-app');

    const watchRootSecond = roots[2].root;

    setUrl('/feed/trending');
    await vi.advanceTimersByTimeAsync(2500);

    expect(watchRootSecond.unmount).toHaveBeenCalledTimes(1);
    expect(document.getElementById('youtube-comment-navigator-app')).toBeNull();
    expect(document.getElementById('youtube-comment-navigator-playlist-batch')).toBeNull();
  });

  it('supports shorts mount and shifts app right when native shorts comments panel opens', async () => {
    setUrl('/shorts/short-a');
    document.body.innerHTML = '<div id="shorts-shell"></div>';

    await import('./content');
    await vi.advanceTimersByTimeAsync(2500);

    const appContainer = document.getElementById('youtube-comment-navigator-app') as HTMLElement;
    expect(appContainer).not.toBeNull();
    expect(appContainer.parentElement).toBe(document.body);
    expect(appContainer.style.position).toBe('fixed');
    expect(appContainer.style.right).toBe('16px');
    expect(appContainer.style.transform).toBe('');

    const shortsPanel = document.createElement('ytd-reel-engagement-panel-overlay-renderer');
    shortsPanel.getBoundingClientRect = vi.fn(
      () =>
        ({
          width: 380,
          height: 600,
          top: 0,
          left: 0,
          right: 380,
          bottom: 600,
          x: 0,
          y: 0,
          toJSON: () => ({
            /* no-op */
          }),
        }) as DOMRect
    );
    document.body.appendChild(shortsPanel);

    await vi.advanceTimersByTimeAsync(1200);

    expect(appContainer.parentElement).toBe(document.body);
    expect(appContainer.style.position).toBe('fixed');
    expect(appContainer.style.left).toBe('');
    expect(appContainer.style.right).toBe('16px');
    expect(appContainer.style.width).toBe('420px');
    expect(appContainer.style.maxWidth).toBe('420px');
    expect(appContainer.style.transform).toMatch(/^translateX\(\d+px\)$/);

    shortsPanel.remove();
    await vi.advanceTimersByTimeAsync(1200);

    expect(appContainer.style.transform).toBe('');
    expect(appContainer.style.right).toBe('16px');
  });
});
