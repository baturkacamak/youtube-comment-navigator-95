import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CommentItem from './CommentItem';
import { Comment } from '../../../types/commentTypes';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../shared/utils/extractYouTubeVideoIdFromUrl', () => ({
  extractYouTubeVideoIdFromUrl: vi.fn().mockReturnValue('test-video-id'),
}));

vi.mock('../../settings/utils/getFormattedDate', () => ({
  default: vi.fn().mockReturnValue('2 hours ago'),
}));

vi.mock('../utils/clipboard/copyToClipboard', () => ({
  copyToClipboard: vi.fn(),
}));

vi.mock('../services/pagination', () => ({
  fetchRepliesForComment: vi.fn(),
}));

// Mock child components to isolate CommentItem logic
const CommentFooterSpy = vi.fn();
vi.mock('./CommentFooter', () => ({
  default: (props: {
    comment: Comment;
    onToggleReplies: () => void;
    showReplies: boolean;
    isFetchingReplies: boolean;
    cacheFetchedReplies: (replies: Comment[]) => void;
    handleCopyToClipboard: () => void;
  }) => {
    CommentFooterSpy(props);
    const { onToggleReplies, showReplies, isFetchingReplies } = props;
    return (
      <div data-testid="comment-footer">
        <button onClick={onToggleReplies} data-testid="toggle-replies-btn">
          {showReplies ? 'Hide replies' : 'Show replies'}
        </button>
        {isFetchingReplies && <span>Loading replies...</span>}
      </div>
    );
  },
}));

vi.mock('./CommentReplies', () => ({
  default: ({
    replies,
    showReplies,
    repliesHeight,
  }: {
    replies: Comment[];
    showReplies: boolean;
    repliesHeight: string;
  }) => (
    <div
      data-testid="comment-replies"
      style={{ maxHeight: repliesHeight, opacity: showReplies ? 1 : 0 }}
    >
      Replies count: {replies.length}
    </div>
  ),
}));

vi.mock('./CommentBody', () => ({
  default: ({ content }: any) => <div>{content}</div>,
}));

vi.mock('./CommentNote', () => ({
  default: () => <div>Note</div>,
}));

vi.mock('../../shared/components/Box', () => ({
  default: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

vi.mock('../../shared/hooks/useSticky', () => ({
  default: () => false,
}));

describe('CommentItem', () => {
  const mockComment: Comment = {
    commentId: 'comment-1',
    videoId: 'video-1',
    author: 'Test Author',
    authorAvatarUrl: 'http://example.com/avatar.jpg',
    authorChannelId: 'channel-1',
    content: 'Test content',
    published: '1 day ago',
    publishedDate: Date.now(),
    likes: 10,
    replyCount: 5,
    replyLevel: 0,
    isAuthorContentCreator: false,
    isMember: false,
    isHearted: false,
    isDonated: false,
    hasTimestamp: false,
    hasLinks: false,
    viewLikes: '10',
    videoTitle: 'Test Video',
    authorBadgeUrl: '',
    authorMemberSince: '',
    donationAmount: '',
    showRepliesDefault: false,
    note: '',
    wordCount: 2,
    normalizedScore: 0,
    weightedZScore: 0,
    bayesianAverage: 0,
    timestamp: Date.now(),
  };

  beforeEach(() => {
    CommentFooterSpy.mockClear();
  });

  it('renders comment content', () => {
    render(<CommentItem comment={mockComment} />);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('toggles replies visibility on button click', async () => {
    const { fetchRepliesForComment } = await import('../services/pagination');
    (fetchRepliesForComment as any).mockResolvedValue([
      { ...mockComment, commentId: 'reply-1', replyLevel: 1 },
    ]);

    render(<CommentItem comment={mockComment} />);

    const toggleBtn = screen.getByTestId('toggle-replies-btn');
    fireEvent.click(toggleBtn);

    // Should call fetch
    expect(fetchRepliesForComment).toHaveBeenCalledWith(expect.anything(), 'video-1', 'comment-1');

    // Wait for replies to load
    await waitFor(() => {
      expect(screen.getByText('Replies count: 1')).toBeInTheDocument();
    });
  });

  it('passes stable handlers to CommentFooter across re-renders', () => {
    const { rerender } = render(<CommentItem comment={mockComment} />);

    expect(CommentFooterSpy).toHaveBeenCalledTimes(1);
    const initialProps = CommentFooterSpy.mock.calls[0][0];

    // Force a re-render by passing a CLONED comment (new ref, same content)
    rerender(<CommentItem comment={{ ...mockComment }} />);

    expect(CommentFooterSpy).toHaveBeenCalledTimes(2);
    const secondProps = CommentFooterSpy.mock.calls[1][0];

    // Handlers should be referentially equal due to useCallback
    expect(secondProps.cacheFetchedReplies).toBe(initialProps.cacheFetchedReplies);
    expect(secondProps.handleCopyToClipboard).toBe(initialProps.handleCopyToClipboard);
  });
});
