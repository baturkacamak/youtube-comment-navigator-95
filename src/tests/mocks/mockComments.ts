import { Comment } from '../../types/commentTypes';

export const mockComments: Comment[] = [
    {
        author: 'Author1',
        likes: 10,
        viewLikes: '10',
        content: 'This is a great video!',
        published: '2024-07-20T00:00:00Z',
        publishedDate: 1721414400000,
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
        publishedDate: 1721500800000,
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
        publishedDate: 1721587200000,
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
        publishedDate: 1721673600000,
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
