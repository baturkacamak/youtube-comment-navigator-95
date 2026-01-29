import { TranscriptEntry } from './processTranscriptData';

/**
 * Formats a time value in seconds to SRT timestamp format (HH:MM:SS,mmm)
 * @param seconds - Time in seconds
 * @returns Formatted timestamp string
 * @throws Error if seconds is negative or not a valid number
 */
export const formatSrtTimestamp = (seconds: number): string => {
  if (typeof seconds !== 'number' || !isFinite(seconds)) {
    throw new Error('Invalid time value: must be a finite number');
  }

  if (seconds < 0) {
    throw new Error('Invalid time value: cannot be negative');
  }

  // Round to nearest millisecond first to handle edge cases like 1.9999
  const totalMilliseconds = Math.round(seconds * 1000);
  const hours = Math.floor(totalMilliseconds / 3600000);
  const minutes = Math.floor((totalMilliseconds % 3600000) / 60000);
  const secs = Math.floor((totalMilliseconds % 60000) / 1000);
  const milliseconds = totalMilliseconds % 1000;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
};

/**
 * Validates a transcript entry has the required fields
 * @param entry - Transcript entry to validate
 * @param index - Index of the entry for error messages
 * @throws Error if entry is invalid
 */
const validateTranscriptEntry = (entry: unknown, index: number): entry is TranscriptEntry => {
  if (!entry || typeof entry !== 'object') {
    throw new Error(`Invalid transcript entry at index ${index}: entry must be an object`);
  }

  const e = entry as Record<string, unknown>;

  if (typeof e.start !== 'number' || !isFinite(e.start)) {
    throw new Error(`Invalid transcript entry at index ${index}: 'start' must be a finite number`);
  }

  if (typeof e.duration !== 'number' || !isFinite(e.duration)) {
    throw new Error(
      `Invalid transcript entry at index ${index}: 'duration' must be a finite number`
    );
  }

  if (typeof e.text !== 'string') {
    throw new Error(`Invalid transcript entry at index ${index}: 'text' must be a string`);
  }

  return true;
};

/**
 * Converts transcript entries to SRT format string
 *
 * SRT format:
 * 1
 * 00:00:02,960 --> 00:00:09,400
 * First subtitle text
 *
 * 2
 * 00:00:06,040 --> 00:00:12,280
 * Second subtitle text
 *
 * @param entries - Array of transcript entries with start, duration, and text
 * @returns SRT formatted string
 * @throws Error if entries is not a valid array or contains invalid entries
 */
export const convertToSrt = (entries: TranscriptEntry[]): string => {
  if (!Array.isArray(entries)) {
    throw new Error('Invalid input: expected an array of transcript entries');
  }

  if (entries.length === 0) {
    return '';
  }

  const srtBlocks: string[] = [];
  let sequenceNumber = 0;

  entries.forEach((entry, index) => {
    validateTranscriptEntry(entry, index);

    const text = entry.text.trim();

    // Skip entries with empty text
    if (!text) {
      return;
    }

    sequenceNumber++;
    const startTime = formatSrtTimestamp(entry.start);
    const endTime = formatSrtTimestamp(entry.start + entry.duration);

    srtBlocks.push(`${sequenceNumber}\n${startTime} --> ${endTime}\n${text}`);
  });

  return srtBlocks.join('\n\n');
};
