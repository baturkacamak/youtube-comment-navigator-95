import { parseNewestCommentThreadsResponse } from './youtubeDataApiMonitorFetch';

describe('youtubeDataApiMonitorFetch', () => {
  it('maps and sorts newest top-level comments from the Data API response', () => {
    const comments = parseNewestCommentThreadsResponse(
      {
        items: [
          {
            snippet: {
              videoId: 'video-1',
              totalReplyCount: 2,
              topLevelComment: {
                id: 'older',
                snippet: {
                  authorDisplayName: 'Older',
                  publishedAt: '2024-01-01T00:00:00Z',
                  textDisplay: 'older comment',
                },
              },
            },
          },
          {
            snippet: {
              videoId: 'video-1',
              totalReplyCount: 0,
              topLevelComment: {
                id: 'newer',
                snippet: {
                  authorDisplayName: 'Newer',
                  publishedAt: '2024-01-02T00:00:00Z',
                  textDisplay: 'newer comment',
                },
              },
            },
          },
        ],
      },
      'video-1'
    );

    expect(comments.map((comment) => comment.commentId)).toEqual(['newer', 'older']);
    expect(comments[0]).toMatchObject({
      author: 'Newer',
      replyCount: 0,
      source: 'dataApi',
      videoId: 'video-1',
    });
  });
});
