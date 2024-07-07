import { Comment } from '../../../../../types/commentTypes';

const sortByLikes = (a: Comment, b: Comment, sortOrder: string) => {
    return sortOrder === 'asc' ? a.likes - b.likes : b.likes - a.likes;
};

export default sortByLikes;
