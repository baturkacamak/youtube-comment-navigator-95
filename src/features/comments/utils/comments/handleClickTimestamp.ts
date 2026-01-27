import logger from '../../../shared/utils/logger';

const handleClickTimestamp = (event: React.MouseEvent<HTMLAnchorElement>) => {
  event.preventDefault();
  const timestamp = event.currentTarget.getAttribute('data-timestamp');
  if (timestamp) {
    const player = document.querySelector('#movie_player') as any;
    if (player && typeof player.seekTo === 'function') {
      const timeParts = timestamp.split(':').map(Number);
      const seconds = timeParts.reduce((acc, part) => acc * 60 + part, 0);
      player.seekTo(seconds, true);
    } else {
      logger.error('Player does not have a seekTo method');
    }
  } else {
    logger.error('YouTube Player is not available');
  }
};

export default handleClickTimestamp;
