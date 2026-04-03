import { describe, expect, it, vi } from 'vitest';
import { extractYouTubeVideoIdFromUrl } from './extractYouTubeVideoIdFromUrl';

describe('extractYouTubeVideoIdFromUrl', () => {
  it('extracts the video id from a valid YouTube URL', () => {
    expect(extractYouTubeVideoIdFromUrl('https://www.youtube.com/watch?v=Oo7GFySCjtc')).toBe(
      'Oo7GFySCjtc'
    );
  });

  it('returns an empty string for nullish or invalid URLs', () => {
    expect(extractYouTubeVideoIdFromUrl('')).toBe('');
    expect(extractYouTubeVideoIdFromUrl('not-a-url')).toBe('');
  });

  it('returns the mock id on localhost', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'localhost',
        href: 'http://localhost:3000/watch?v=test',
      },
    });

    expect(extractYouTubeVideoIdFromUrl()).toBe('mock-video-id');

    vi.unstubAllGlobals();
  });
});
