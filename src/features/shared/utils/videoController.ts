import logger from './logger';

/**
 * Sends a message to the main world to seek the video to the specified time.
 * @param seconds Time in seconds to seek to
 */
export const seekVideo = (seconds: number) => {
  if (isNaN(seconds)) {
    logger.error('Invalid time for seekVideo:', seconds);
    return;
  }

  logger.info(`Sending seek command for ${seconds}s`);
  window.postMessage({ type: 'YCN_SEEK_TO', seconds }, '*');
};
