import { Comment } from '../../../../../types/commentTypes';

const sortByAuthor = (a: Comment, b: Comment, sortOrder: string) => {
    return sortOrder === 'asc' ? a.author.localeCompare(b.author) : b.author.localeCompare(a.author);
};

export default sortByAuthor;
