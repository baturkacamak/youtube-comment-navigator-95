import { convertToSrt, formatSrtTimestamp } from './convertToSrt';
import { TranscriptEntry } from './processTranscriptData';

describe('formatSrtTimestamp', () => {
  it('should format zero seconds correctly', () => {
    expect(formatSrtTimestamp(0)).toBe('00:00:00,000');
  });

  it('should format seconds with milliseconds', () => {
    expect(formatSrtTimestamp(2.96)).toBe('00:00:02,960');
  });

  it('should format minutes and seconds', () => {
    expect(formatSrtTimestamp(65.5)).toBe('00:01:05,500');
  });

  it('should format hours, minutes, and seconds', () => {
    expect(formatSrtTimestamp(3723.456)).toBe('01:02:03,456');
  });

  it('should handle large values', () => {
    expect(formatSrtTimestamp(7200)).toBe('02:00:00,000');
  });

  it('should round milliseconds correctly', () => {
    expect(formatSrtTimestamp(1.9999)).toBe('00:00:02,000');
  });

  it('should throw error for negative values', () => {
    expect(() => formatSrtTimestamp(-1)).toThrow('Invalid time value: cannot be negative');
  });

  it('should throw error for NaN', () => {
    expect(() => formatSrtTimestamp(NaN)).toThrow('Invalid time value: must be a finite number');
  });

  it('should throw error for Infinity', () => {
    expect(() => formatSrtTimestamp(Infinity)).toThrow(
      'Invalid time value: must be a finite number'
    );
  });
});

describe('convertToSrt', () => {
  const sampleTranscript: TranscriptEntry[] = [
    { start: 2.96, duration: 6.44, text: 'Evet gençler Nasılsınız Bomba gibiyiz' },
    { start: 6.04, duration: 6.24, text: 'abi diyeceksiniz Bugün de dedim ki şu' },
    { start: 9.4, duration: 5, text: 'çocuklara biraz kariyerler le alakalı iş' },
  ];

  it('should convert transcript entries to SRT format', () => {
    const result = convertToSrt(sampleTranscript);

    expect(result).toBe(
      `1\n00:00:02,960 --> 00:00:09,400\nEvet gençler Nasılsınız Bomba gibiyiz\n\n` +
        `2\n00:00:06,040 --> 00:00:12,280\nabi diyeceksiniz Bugün de dedim ki şu\n\n` +
        `3\n00:00:09,400 --> 00:00:14,400\nçocuklara biraz kariyerler le alakalı iş`
    );
  });

  it('should handle single entry', () => {
    const singleEntry: TranscriptEntry[] = [{ start: 0, duration: 5, text: 'Hello world' }];

    const result = convertToSrt(singleEntry);

    expect(result).toBe('1\n00:00:00,000 --> 00:00:05,000\nHello world');
  });

  it('should return empty string for empty array', () => {
    expect(convertToSrt([])).toBe('');
  });

  it('should skip entries with empty text', () => {
    const withEmpty: TranscriptEntry[] = [
      { start: 0, duration: 5, text: 'First' },
      { start: 5, duration: 5, text: '   ' },
      { start: 10, duration: 5, text: 'Second' },
    ];

    const result = convertToSrt(withEmpty);

    expect(result).toBe(
      '1\n00:00:00,000 --> 00:00:05,000\nFirst\n\n2\n00:00:10,000 --> 00:00:15,000\nSecond'
    );
  });

  it('should trim text whitespace', () => {
    const withWhitespace: TranscriptEntry[] = [{ start: 0, duration: 5, text: '  Hello world  ' }];

    const result = convertToSrt(withWhitespace);

    expect(result).toBe('1\n00:00:00,000 --> 00:00:05,000\nHello world');
  });

  it('should preserve multiline text', () => {
    const multiline: TranscriptEntry[] = [{ start: 0, duration: 5, text: 'Line 1\nLine 2' }];

    const result = convertToSrt(multiline);

    expect(result).toBe('1\n00:00:00,000 --> 00:00:05,000\nLine 1\nLine 2');
  });

  it('should throw error for non-array input', () => {
    expect(() => convertToSrt('not an array' as unknown as TranscriptEntry[])).toThrow(
      'Invalid input: expected an array of transcript entries'
    );

    expect(() => convertToSrt(null as unknown as TranscriptEntry[])).toThrow(
      'Invalid input: expected an array of transcript entries'
    );

    expect(() => convertToSrt(undefined as unknown as TranscriptEntry[])).toThrow(
      'Invalid input: expected an array of transcript entries'
    );
  });

  it('should throw error for entry with missing start', () => {
    const invalid = [{ duration: 5, text: 'Hello' }] as unknown as TranscriptEntry[];

    expect(() => convertToSrt(invalid)).toThrow(
      "Invalid transcript entry at index 0: 'start' must be a finite number"
    );
  });

  it('should throw error for entry with missing duration', () => {
    const invalid = [{ start: 0, text: 'Hello' }] as unknown as TranscriptEntry[];

    expect(() => convertToSrt(invalid)).toThrow(
      "Invalid transcript entry at index 0: 'duration' must be a finite number"
    );
  });

  it('should throw error for entry with missing text', () => {
    const invalid = [{ start: 0, duration: 5 }] as unknown as TranscriptEntry[];

    expect(() => convertToSrt(invalid)).toThrow(
      "Invalid transcript entry at index 0: 'text' must be a string"
    );
  });

  it('should throw error for entry with invalid start type', () => {
    const invalid = [{ start: '0', duration: 5, text: 'Hello' }] as unknown as TranscriptEntry[];

    expect(() => convertToSrt(invalid)).toThrow(
      "Invalid transcript entry at index 0: 'start' must be a finite number"
    );
  });

  it('should throw error for null entry', () => {
    const invalid = [null] as unknown as TranscriptEntry[];

    expect(() => convertToSrt(invalid)).toThrow(
      'Invalid transcript entry at index 0: entry must be an object'
    );
  });

  it('should include correct index in error message for invalid entry', () => {
    const invalid = [
      { start: 0, duration: 5, text: 'Valid' },
      { start: 5, duration: 5, text: 'Also valid' },
      { start: 'invalid', duration: 5, text: 'Invalid' },
    ] as unknown as TranscriptEntry[];

    expect(() => convertToSrt(invalid)).toThrow(
      "Invalid transcript entry at index 2: 'start' must be a finite number"
    );
  });

  it('should handle Unicode characters', () => {
    const unicode: TranscriptEntry[] = [
      { start: 0, duration: 5, text: '日本語テキスト' },
      { start: 5, duration: 5, text: 'Привет мир' },
      { start: 10, duration: 5, text: '🎉 Emoji test 🚀' },
    ];

    const result = convertToSrt(unicode);

    expect(result).toContain('日本語テキスト');
    expect(result).toContain('Привет мир');
    expect(result).toContain('🎉 Emoji test 🚀');
  });

  it('should handle very small durations', () => {
    const smallDuration: TranscriptEntry[] = [{ start: 0, duration: 0.001, text: 'Quick' }];

    const result = convertToSrt(smallDuration);

    expect(result).toBe('1\n00:00:00,000 --> 00:00:00,001\nQuick');
  });

  it('should handle overlapping timestamps correctly', () => {
    const overlapping: TranscriptEntry[] = [
      { start: 0, duration: 10, text: 'First (long)' },
      { start: 5, duration: 3, text: 'Second (starts in middle of first)' },
    ];

    const result = convertToSrt(overlapping);

    expect(result).toBe(
      '1\n00:00:00,000 --> 00:00:10,000\nFirst (long)\n\n' +
        '2\n00:00:05,000 --> 00:00:08,000\nSecond (starts in middle of first)'
    );
  });
});
