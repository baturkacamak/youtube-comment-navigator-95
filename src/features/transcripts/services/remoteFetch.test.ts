import { describe, expect, it } from 'vitest';
import { buildTranscriptRequestUrl } from './remoteFetch';

describe('buildTranscriptRequestUrl', () => {
  it('adds json3 and youtube web client params', () => {
    const result = new URL(
      buildTranscriptRequestUrl('https://www.youtube.com/api/timedtext?v=abc123&lang=en')
    );

    expect(result.searchParams.get('fmt')).toBe('json3');
    expect(result.searchParams.get('c')).toBe('WEB');
  });

  it('adds translation language when different from source language', () => {
    const result = new URL(
      buildTranscriptRequestUrl('https://www.youtube.com/api/timedtext?v=abc123&lang=en', {
        language: 'tr',
      })
    );

    expect(result.searchParams.get('tlang')).toBe('tr');
  });

  it('does not add translation language when it matches source language', () => {
    const result = new URL(
      buildTranscriptRequestUrl('https://www.youtube.com/api/timedtext?v=abc123&lang=en', {
        language: 'en',
      })
    );

    expect(result.searchParams.get('tlang')).toBeNull();
  });

  it('adds pot token params when available', () => {
    const result = new URL(
      buildTranscriptRequestUrl('https://www.youtube.com/api/timedtext?v=abc123&lang=en', {
        potToken: 'token-123',
      })
    );

    expect(result.searchParams.get('pot')).toBe('token-123');
    expect(result.searchParams.get('potc')).toBe('1');
  });
});
