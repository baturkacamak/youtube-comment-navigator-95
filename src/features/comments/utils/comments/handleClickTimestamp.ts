import { seekVideo } from '../../../shared/utils/videoController';

const handleClickTimestamp = (event: React.MouseEvent<HTMLAnchorElement>) => {
  event.preventDefault();
  const timestamp = event.currentTarget.getAttribute('data-timestamp');
  if (timestamp) {
    const timeParts = timestamp.split(':').map(Number);
    const seconds = timeParts.reduce((acc, part) => acc * 60 + part, 0);
    seekVideo(seconds);
  } else {
  }
};

export default handleClickTimestamp;
