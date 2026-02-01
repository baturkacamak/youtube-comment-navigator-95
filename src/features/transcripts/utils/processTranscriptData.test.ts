import { processTranscriptData } from './processTranscriptData';

describe('processTranscriptData', () => {
  it('should correctly parse the new YouTube transcript JSON format', () => {
    const mockData = {
      wireMagic: 'pb3',
      pens: [{ /* no-op */ }],
      wsWinStyles: [{ /* no-op */ }, { mhModeHint: 2, juJustifCode: 0, sdScrollDir: 3 }],
      wpWinPositions: [{ /* no-op */ }, { apPoint: 6, ahHorPos: 20, avVerPos: 100, rcRows: 2, ccCols: 40 }],
      events: [
        {
          tStartMs: 0,
          dDurationMs: 2584680,
          id: 1,
          wpWinPosId: 1,
          wsWinStyleId: 1,
        },
        {
          tStartMs: 199,
          dDurationMs: 3761,
          wWinId: 1,
          segs: [
            {
              utf8: 'Etopya.com',
              acAsrConf: 0,
            },
            {
              utf8: ' sunar.',
              tOffsetMs: 761,
              acAsrConf: 0,
            },
          ],
        },
        {
          tStartMs: 9150,
          wWinId: 1,
          aAppend: 1,
          segs: [
            {
              utf8: '\n',
            },
          ],
        },
        {
          tStartMs: 9160,
          dDurationMs: 6639,
          wWinId: 1,
          segs: [
            {
              utf8: '>> Teknoseir',
              acAsrConf: 0,
            },
            {
              utf8: ' sunucu',
              tOffsetMs: 720,
              acAsrConf: 0,
            },
          ],
        },
      ],
    };

    const result = processTranscriptData(mockData);

    expect(result.items).toHaveLength(2);

    // Check first item (second event in source, first with content)
    expect(result.items[0]).toEqual({
      start: 0.199,
      duration: 3.761,
      text: 'Etopya.com sunar.',
    });

    // Check second item (fourth event in source, skipping the newline one which is trimmed)
    // Wait, does processTranscriptData filter out pure newlines?
    // logic: .filter((item: TranscriptEntry) => item.text.trim() !== '')
    // "\n".trim() is "", so it should be filtered out.

    expect(result.items[1]).toEqual({
      start: 9.16,
      duration: 6.639,
      text: '>> Teknoseir sunucu',
    });
  });

  it('should throw error for invalid format', () => {
    expect(() => processTranscriptData({ /* no-op */ })).toThrow('Invalid transcript data format');
    expect(() => processTranscriptData(null)).toThrow('Invalid transcript data format');
  });
});
