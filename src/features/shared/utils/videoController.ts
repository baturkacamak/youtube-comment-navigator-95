import { timestampToSeconds } from './timestamps';

/**
 * Sends a message to the main world to seek the video to the specified time.
 * @param seconds Time in seconds to seek to
 */
export const seekVideo = (seconds: number) => {
  if (isNaN(seconds)) {
    return;
  }

  window.postMessage({ type: 'YCN_SEEK_TO', seconds }, '*');
};

export const seekVideoToTimestamp = (timestamp: string): boolean => {
  const seconds = timestampToSeconds(timestamp);
  if (seconds === null) return false;

  seekVideo(seconds);
  return true;
};
