import { Comment } from '../../../../../types/commentTypes';

const sortByDate = (a: Comment, b: Comment, sortOrder: string) => {
  return sortOrder === 'asc'
    ? new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime()
    : new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
};

export default sortByDate;
