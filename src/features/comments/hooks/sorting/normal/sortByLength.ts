import { Comment } from '../../../../../types/commentTypes';

const sortByLength = (a: Comment, b: Comment, sortOrder: string) => {
  return sortOrder === 'asc'
    ? a.content.length - b.content.length
    : b.content.length - a.content.length;
};

export default sortByLength;
