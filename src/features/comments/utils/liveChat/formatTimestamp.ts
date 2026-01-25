/**
 * Format a timestamp in seconds to HH:MM:SS or MM:SS format
 * @param seconds Timestamp in seconds
 * @returns Formatted timestamp string
 */
export function formatTimestamp(seconds: number): string {
  if (!seconds || seconds < 0) {
    return '0:00';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse a timestamp string (HH:MM:SS or MM:SS) to seconds
 * @param timestamp Timestamp string
 * @returns Timestamp in seconds
 */
export function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':').map(Number);

  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  }

  return 0;
}
