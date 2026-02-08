import { describe, it, expect } from 'vitest';
import { extractYouTubeVideoIdFromUrl } from './extractYouTubeVideoIdFromUrl';

describe('extractYouTubeVideoIdFromUrl', () => {
  it('extracts video id from watch URLs', () => {
    const result = extractYouTubeVideoIdFromUrl(
      'https://www.youtube.com/watch?v=abc123XYZ&list=PL1'
    );
    expect(result).toBe('abc123XYZ');
  });

  it('extracts video id from shorts URLs', () => {
    const result = extractYouTubeVideoIdFromUrl('https://www.youtube.com/shorts/shortId987');
    expect(result).toBe('shortId987');
  });

  it('extracts video id from youtu.be URLs', () => {
    const result = extractYouTubeVideoIdFromUrl('https://youtu.be/clipId555?t=10');
    expect(result).toBe('clipId555');
  });

  it('extracts video id from embed URLs', () => {
    const result = extractYouTubeVideoIdFromUrl(
      'https://www.youtube.com/embed/embedId222?autoplay=1'
    );
    expect(result).toBe('embedId222');
  });

  it('returns empty string for invalid/non-video URLs', () => {
    const result = extractYouTubeVideoIdFromUrl('https://www.youtube.com/feed/trending');
    expect(result).toBe('');
  });

  it('returns mock id for localhost URLs', () => {
    const result = extractYouTubeVideoIdFromUrl('http://localhost/watch?v=realId');
    expect(result).toBe('mock-video-id');
  });
});
