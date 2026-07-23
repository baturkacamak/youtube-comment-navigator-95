import { seekVideoToTimestamp } from '../../../shared/utils/videoController';

const handleClickTimestamp = (event: React.MouseEvent<HTMLButtonElement>) => {
  event.preventDefault();
  const timestamp = event.currentTarget.getAttribute('data-timestamp');
  if (timestamp) seekVideoToTimestamp(timestamp);
};

export default handleClickTimestamp;
