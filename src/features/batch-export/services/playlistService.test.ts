import {
  getCurrentPlaylistId,
  getPlaylistVideos,
  isPlaylistContextPage,
  isPlaylistWatchPage,
} from './playlistService';

describe('playlistService', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    (window as Window & { ytInitialData?: unknown }).ytInitialData = undefined;
  });

  it('detects playlist context on watch and playlist URLs', () => {
    window.history.pushState({}, '', '/watch?v=abc123&list=PLxyz');
    expect(isPlaylistWatchPage()).toBe(true);
    expect(isPlaylistContextPage()).toBe(true);

    window.history.pushState({}, '', '/playlist?list=PLxyz');
    expect(isPlaylistWatchPage()).toBe(true);
    expect(isPlaylistContextPage()).toBe(true);
  });

  it('returns playlist id from URL', () => {
    window.history.pushState({}, '', '/watch?v=abc123&list=PL_test_001');
    expect(getCurrentPlaylistId()).toBe('PL_test_001');
  });

  it('extracts videos from ytInitialData on watch page', () => {
    window.history.pushState({}, '', '/watch?v=video_a&list=PL_from_data');
    (window as Window & { ytInitialData?: unknown }).ytInitialData = {
      contents: {
        twoColumnWatchNextResults: {
          playlist: {
            playlist: {
              contents: [
                {
                  playlistPanelVideoRenderer: {
                    videoId: 'video_a',
                    title: { simpleText: 'First Video' },
                    index: { simpleText: '1' },
                  },
                },
                {
                  playlistPanelVideoRenderer: {
                    videoId: 'video_b',
                    title: { runs: [{ text: 'Second' }, { text: ' Video' }] },
                    index: { simpleText: '2' },
                  },
                },
              ],
            },
          },
        },
      },
    };

    const videos = getPlaylistVideos();

    expect(videos).toHaveLength(2);
    expect(videos[0]).toMatchObject({ videoId: 'video_a', title: 'First Video', index: 1 });
    expect(videos[1]).toMatchObject({ videoId: 'video_b', title: 'Second Video', index: 2 });
  });

  it('extracts videos from playlist page DOM', () => {
    window.history.pushState({}, '', '/playlist?list=PL_dom_only');
    document.body.innerHTML = `
      <ytd-playlist-video-renderer>
        <a id="video-title" href="/watch?v=video_2&list=PL_dom_only">Second DOM video</a>
        <span id="index">2</span>
      </ytd-playlist-video-renderer>
      <ytd-playlist-video-renderer>
        <a id="video-title" href="/watch?v=video_1&list=PL_dom_only">First DOM video</a>
        <span id="index">1</span>
      </ytd-playlist-video-renderer>
    `;

    const videos = getPlaylistVideos();

    expect(videos).toHaveLength(2);
    expect(videos.map((video) => video.videoId).sort()).toEqual(['video_1', 'video_2']);
    expect(videos.every((video) => video.index >= 1)).toBe(true);
  });
});
