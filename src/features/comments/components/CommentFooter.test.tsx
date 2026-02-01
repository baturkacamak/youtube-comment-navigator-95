import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import CommentFooter from './CommentFooter';
import { vi } from 'vitest';
import { Comment } from '../../../types/commentTypes';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../shared/utils/extractYouTubeVideoIdFromUrl', () => ({
  extractYouTubeVideoIdFromUrl: () => 'video-1',
}));

vi.mock('../../settings/utils/getFormattedDate', () => ({
  default: () => '2 hours ago',
}));

vi.mock('./BookmarkButton/BookmarkButton', () => ({
  default: () => <button>BookmarkButton</button>,
}));

vi.mock('../../shared/components/ShareButton', () => ({
  default: () => <button>ShareButton</button>,
}));

vi.mock('../../shared/components/Tooltip', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../shared/utils/hoverAction', () => ({
  default: class {
    destroy() { /* no-op */ }
  },
}));

vi.mock('../services/pagination', () => ({
  fetchRepliesForComment: vi.fn(),
}));

vi.mock('../../shared/utils/logger', () => ({
  default: {
    start: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    end: vi.fn(),
  },
}));

vi.mock('../../shared/utils/database/database', () => ({
  db: {
    comments: { /* no-op */ },
  },
}));

vi.mock('../../shared/utils/eventEmitter', () => ({
  eventEmitter: {
    emit: vi.fn(),
  },
}));

describe('CommentFooter', () => {
  const mockComment: Comment = {
    commentId: 'comment-1',
    videoId: 'video-1',
    author: 'Author',
    content: 'Content',
    publishedDate: Date.now(),
    likes: 10,
    replyCount: 0,
    replyLevel: 0,
    viewLikes: '10',
    isAuthorContentCreator: false,
    isDonated: false,
    isHearted: false,
    isMember: false,
    authorAvatarUrl: 'url',
    authorChannelId: 'channel-1',
  } as unknown as Comment;

  const defaultProps = {
    comment: mockComment,
    showReplies: false,
    onToggleReplies: vi.fn(),
    cacheFetchedReplies: vi.fn(),
    isFetchingReplies: false,
    handleCopyToClipboard: vi.fn(),
    copySuccess: false,
  };

  it('has aria-hidden="true" and select-none class', () => {
    const { container } = render(<CommentFooter {...defaultProps} />);
    const footerDiv = container.firstChild as HTMLElement;

    expect(footerDiv).toHaveAttribute('aria-hidden', 'true');
    expect(footerDiv).toHaveClass('select-none');
  });
});
