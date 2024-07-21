import { searchComments } from './commentSearchService';  // Adjust the import path as necessary
import { Comment } from '../../../types/commentTypes';

const mockComments: Comment[] = [
    {
        author: 'Author1',
        likes: 10,
        viewLikes: '10',
        content: 'This is a great video!',
        published: '2024-07-20T00:00:00Z',
        publishedDate: 1721414400000,  // Example timestamp for 2024-07-20
        authorAvatarUrl: '',
        isAuthorContentCreator: false,
        authorChannelId: 'channel1',
        replyCount: 2,
        commentId: '1',
        commentParentId: undefined,
        replyLevel: 0,
        hasTimestamp: false,
        hasLinks: false
    },
    {
        author: 'Author2',
        likes: 5,
        viewLikes: '5',
        content: 'I completely agree with the points made.',
        published: '2024-07-21T00:00:00Z',
        publishedDate: 1721500800000,  // Example timestamp for 2024-07-21
        authorAvatarUrl: '',
        isAuthorContentCreator: false,
        authorChannelId: 'channel2',
        replyCount: 0,
        commentId: '2',
        commentParentId: '1',
        replyLevel: 1,
        hasTimestamp: false,
        hasLinks: false
    },
    {
        author: 'Author3',
        likes: 15,
        viewLikes: '15',
        content: 'Thanks for the detailed explanation.',
        published: '2024-07-22T00:00:00Z',
        publishedDate: 1721587200000,  // Example timestamp for 2024-07-22
        authorAvatarUrl: '',
        isAuthorContentCreator: false,
        authorChannelId: 'channel3',
        replyCount: 1,
        commentId: '3',
        commentParentId: undefined,
        replyLevel: 0,
        hasTimestamp: false,
        hasLinks: false
    },
    {
        author: 'Author4',
        likes: 3,
        viewLikes: '3',
        content: 'This explanation cleared all my doubts.',
        published: '2024-07-23T00:00:00Z',
        publishedDate: 1721673600000,  // Example timestamp for 2024-07-23
        authorAvatarUrl: '',
        isAuthorContentCreator: false,
        authorChannelId: 'channel4',
        replyCount: 0,
        commentId: '4',
        commentParentId: '3',
        replyLevel: 1,
        hasTimestamp: false,
        hasLinks: false
    },
];

describe('searchComments', () => {
    it('should return comments that match the keyword', () => {
        const keyword = 'great';
        const result = searchComments(mockComments, keyword);
        expect(result.length).toBe(1);
        expect(result[0].content).toBe('This is a great video!');
    });

    it('should return comments with parents if child matches the keyword', () => {
        const keyword = 'agree';
        const result = searchComments(mockComments, keyword);
        expect(result.length).toBe(2);
        expect(result.find(comment => comment.content === 'This is a great video!')).toBeTruthy();
        expect(result.find(comment => comment.content === 'I completely agree with the points made.')).toBeTruthy();
    });

    it('should return comments that match the keyword fuzzily', () => {
        const keyword = 'explanatin';  // 10-character misspelling
        const result = searchComments(mockComments, keyword);
        expect(result.length).toBe(2);
        expect(result.find(comment => comment.content === 'Thanks for the detailed explanation.')).toBeTruthy();
        expect(result.find(comment => comment.content === 'This explanation cleared all my doubts.')).toBeTruthy();
    });

    it('should return comments sorted with parents above children', () => {
        const keyword = 'explanation';
        const result = searchComments(mockComments, keyword);
        expect(result.length).toBe(2);
        expect(result[0].content).toBe('Thanks for the detailed explanation.');
        expect(result[1].content).toBe('This explanation cleared all my doubts.');
    });

    it('should return an empty array if no comments match the keyword', () => {
        const keyword = 'nonexistent';
        const result = searchComments(mockComments, keyword);
        expect(result.length).toBe(0);
    });

    it('should handle an empty list of comments', () => {
        const keyword = 'great';
        const result = searchComments([], keyword);
        expect(result.length).toBe(0);
    });

    it('should handle a keyword that results in exact matches and fuzzy matches', () => {
        const keyword = 'explnation';  // Misspelling to test fuzzy matching
        const result = searchComments(mockComments, keyword);
        expect(result.length).toBe(2);
        expect(result.find(comment => comment.content === 'Thanks for the detailed explanation.')).toBeTruthy();
        expect(result.find(comment => comment.content === 'This explanation cleared all my doubts.')).toBeTruthy();
    });
});
