import type { Comment } from '../../../types/commentTypes';
import {
  diffNewComments,
  mergeSavedCommentSnapshots,
  pickTopLevelNewestComments,
} from './commentMonitorDiff';

const createComment = (
  commentId: string,
  publishedDate: number,
  overrides: Partial<Comment> = {}
): Comment => ({
  author: 'Author',
  likes: 0,
  viewLikes: '0',
  content: `Comment ${commentId}`,
  published: '1 minute ago',
  publishedDate,
  authorAvatarUrl: '',
  isAuthorContentCreator: false,
  authorChannelId: '',
  replyCount: 0,
  commentId,
  replyLevel: 0,
  hasTimestamp: false,
  hasLinks: false,
  videoId: 'video-1',
  ...overrides,
});

describe('commentMonitorDiff', () => {
  it('keeps only newest top-level comments', () => {
    const comments = [
      createComment('older', 100),
      createComment('reply', 400, { replyLevel: 1 }),
      createComment('newer', 300),
      createComment('newest', 500),
    ];

    expect(pickTopLevelNewestComments(comments).map((comment) => comment.commentId)).toEqual([
      'newest',
      'newer',
      'older',
    ]);
  });

  it('detects new comments against the previous seen window', () => {
    const comments = [createComment('c3', 300), createComment('c2', 200), createComment('c1', 100)];

    const diff = diffNewComments(['c2', 'c1'], comments);

    expect(diff.newComments.map((comment) => comment.commentId)).toEqual(['c3']);
    expect(diff.nextSeenCommentIds).toEqual(['c3', 'c2', 'c1']);
  });

  it('stores newly seen comment snapshots without duplicates', () => {
    const saved = mergeSavedCommentSnapshots(
      [
        {
          commentId: 'c1',
          author: 'Author',
          content: 'Existing',
          published: '1 minute ago',
          detectedAt: 1,
        },
      ],
      [createComment('c1', 100), createComment('c2', 200)]
    );

    expect(saved.map((comment) => comment.commentId)).toEqual(['c1', 'c2']);
  });
});
