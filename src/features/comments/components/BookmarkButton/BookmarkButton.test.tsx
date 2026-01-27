import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import BookmarkButton from './BookmarkButton';
import { vi } from 'vitest';
import { Comment } from '../../../../types/commentTypes';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockDispatch = vi.fn();
vi.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: any) =>
    selector({
      bookmarkedComments: [{ commentId: 'bookmarked-comment', bookmarkAddedDate: '2023-01-01' }],
    }),
}));

vi.mock('../../../shared/utils/database/database', () => ({
  db: {
    comments: {
      update: vi.fn(),
      put: vi.fn(),
      where: () => ({
        notEqual: () => ({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    },
  },
}));

vi.mock('../../../shared/utils/extractYouTubeVideoIdFromUrl', () => ({
  extractYouTubeVideoIdFromUrl: () => 'video-1',
}));

vi.mock('../../../shared/utils/getVideoTitle', () => ({
  getVideoTitle: () => 'Video Title',
}));

vi.mock('./NoteInputModal', () => ({
  default: () => <div data-testid="note-input-modal">Note Input</div>,
}));

describe('BookmarkButton', () => {
  const mockComment: Comment = {
    commentId: 'comment-1',
    videoId: 'video-1',
    author: 'Author',
    content: 'Content',
    publishedDate: Date.now(),
    likes: 0,
    replyCount: 0,
    replyLevel: 0,
    // ... add other required fields or use partial cast if Typescript complains too much in test
  } as any;

  const bookmarkedComment: Comment = {
    ...mockComment,
    commentId: 'bookmarked-comment',
  } as any;

  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('renders correctly (not bookmarked)', () => {
    render(<BookmarkButton comment={mockComment} />);
    expect(screen.getByLabelText('Bookmark')).toBeInTheDocument();
    // Should show generic BookmarkIcon (outline) - we can't easily check icon type without inspecting svg paths or class names if not distinct enough,
    // but we can check it doesn't have the active class
    const btn = screen.getByLabelText('Bookmark');
    expect(btn).toHaveClass('text-gray-600');
  });

  it('renders correctly (bookmarked)', () => {
    render(<BookmarkButton comment={bookmarkedComment} />);
    const btn = screen.getByLabelText('Bookmark');
    expect(btn).toHaveClass('text-yellow-600');
  });
});
