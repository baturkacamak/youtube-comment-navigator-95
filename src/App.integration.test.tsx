import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { screen, fireEvent, waitFor, within } from '@testing-library/dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Filters } from './types/filterTypes';

// Define Mock Types globally for usage in mocks
interface MockComment {
  commentId: string;
  videoId: string;
  author: string;
  authorAvatarUrl: string;
  authorChannelId: string;
  content: string;
  published: string;
  publishedDate: number;
  likes: number;
  viewLikes: string;
  replyCount: number;
  replyLevel: number;
  isAuthorContentCreator: boolean;
  isHearted: boolean;
  isPinned: boolean;
  hasTimestamp: boolean;
  hasLinks: boolean;
  replies?: MockComment[];
}

interface MockTranscriptLine {
  id: string;
  text: string;
  startTime: number;
  duration: number;
}

// ============================================================================
// Global Mocks
// ============================================================================
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// ============================================================================
// Hoisted Mock Data - Must be defined before vi.mock calls
// ============================================================================

const {
  mockComments,
  mockLiveChatMessages,
  mockTranscriptLines,
  mockState,
  filterByKeyword,
  filterComments,
  sortComments,
} = vi.hoisted(() => {
  interface MockComment {
    commentId: string;
    videoId: string;
    author: string;
    authorAvatarUrl: string;
    authorChannelId: string;
    content: string;
    published: string;
    publishedDate: number;
    likes: number;
    viewLikes: string;
    replyCount: number;
    replyLevel: number;
    isAuthorContentCreator: boolean;
    hasTimestamp: boolean;
    hasLinks: boolean;
    isMember?: boolean;
    isDonated?: boolean;
    isHearted?: boolean;
    donationAmount?: string;
    wordCount?: number;
    isBookmarked?: boolean;
    bookmarkAddedDate?: string;
    note?: string;
  }

  interface MockLiveChatMessage {
    id: string;
    author: string;
    message: string;
    timestamp: number;
    isMember: boolean;
    isDonated: boolean;
  }

  interface MockTranscriptLine {
    id: string;
    text: string;
    startTime: number;
    duration: number;
  }

  // Comprehensive mock comments covering all possible scenarios
  const mockComments: MockComment[] = [
    {
      commentId: 'comment-1',
      videoId: 'test-video-123',
      author: 'John Doe',
      authorAvatarUrl: 'https://example.com/avatar1.jpg',
      authorChannelId: 'channel-1',
      content:
        'This is a great tutorial about React testing! Check out https://react.dev for more info. 🎉',
      published: '2 days ago',
      publishedDate: Date.now() - 172800000,
      likes: 150,
      viewLikes: '150',
      replyCount: 12,
      replyLevel: 0,
      isAuthorContentCreator: false,
      hasTimestamp: true,
      hasLinks: true,
      isMember: false,
      isDonated: false,
      isHearted: true,
      wordCount: 15,
    },
    {
      commentId: 'comment-2',
      videoId: 'test-video-123',
      author: 'Jane Smith',
      authorAvatarUrl: 'https://example.com/avatar2.jpg',
      authorChannelId: 'channel-2',
      content: 'I learned so much from this video. Thank you! The explanation at 2:30 was perfect.',
      published: '1 day ago',
      publishedDate: Date.now() - 86400000,
      likes: 28,
      viewLikes: '28',
      replyCount: 2,
      replyLevel: 0,
      isAuthorContentCreator: false,
      hasTimestamp: true,
      hasLinks: false,
      isMember: true,
      isDonated: false,
      isHearted: false,
      wordCount: 16,
    },
    {
      commentId: 'comment-3',
      videoId: 'test-video-123',
      author: 'Bob Wilson',
      authorAvatarUrl: 'https://example.com/avatar3.jpg',
      authorChannelId: 'channel-3',
      content:
        'The JavaScript examples at 5:30 were very helpful for understanding async patterns.',
      published: '3 hours ago',
      publishedDate: Date.now() - 10800000,
      likes: 75,
      viewLikes: '75',
      replyCount: 8,
      replyLevel: 0,
      isAuthorContentCreator: false,
      hasTimestamp: true,
      hasLinks: false,
      isMember: false,
      isDonated: true,
      isHearted: false,
      donationAmount: '$5.00',
      wordCount: 13,
    },
    {
      commentId: 'comment-4',
      videoId: 'test-video-123',
      author: 'Alice Johnson',
      authorAvatarUrl: 'https://example.com/avatar4.jpg',
      authorChannelId: 'channel-4',
      content: 'Amazing content as always! Keep up the great work. 👍',
      published: '5 hours ago',
      publishedDate: Date.now() - 18000000,
      likes: 42,
      viewLikes: '42',
      replyCount: 0,
      replyLevel: 0,
      isAuthorContentCreator: true,
      hasTimestamp: false,
      hasLinks: false,
      isMember: true,
      isDonated: false,
      isHearted: true,
      wordCount: 9,
    },
    {
      commentId: 'comment-5',
      videoId: 'test-video-123',
      author: 'Charlie Brown',
      authorAvatarUrl: 'https://example.com/avatar5.jpg',
      authorChannelId: 'channel-5',
      content: 'Short.',
      published: '1 week ago',
      publishedDate: Date.now() - 604800000,
      likes: 3,
      viewLikes: '3',
      replyCount: 0,
      replyLevel: 0,
      isAuthorContentCreator: false,
      hasTimestamp: false,
      hasLinks: false,
      isMember: false,
      isDonated: false,
      isHearted: false,
      wordCount: 1,
    },
    {
      commentId: 'comment-6',
      videoId: 'test-video-123',
      author: 'Diana Prince',
      authorAvatarUrl: 'https://example.com/avatar6.jpg',
      authorChannelId: 'channel-6',
      content:
        'This is a very long comment that contains many words to test the word count filtering feature. I want to make sure that comments with high word counts are properly filtered when the user sets minimum and maximum word count thresholds in the advanced filters section. This comment also contains a link: https://example.com',
      published: '2 weeks ago',
      publishedDate: Date.now() - 1209600000,
      likes: 200,
      viewLikes: '200',
      replyCount: 25,
      replyLevel: 0,
      isAuthorContentCreator: false,
      hasTimestamp: false,
      hasLinks: true,
      isMember: true,
      isDonated: true,
      isHearted: true,
      donationAmount: '$20.00',
      wordCount: 55,
    },
    {
      commentId: 'comment-7',
      videoId: 'test-video-123',
      author: 'Edward Norton',
      authorAvatarUrl: 'https://example.com/avatar7.jpg',
      authorChannelId: 'channel-7',
      content: 'First comment! Great video about TypeScript and React hooks.',
      published: '3 weeks ago',
      publishedDate: Date.now() - 1814400000,
      likes: 500,
      viewLikes: '500',
      replyCount: 50,
      replyLevel: 0,
      isAuthorContentCreator: false,
      hasTimestamp: false,
      hasLinks: false,
      isMember: false,
      isDonated: false,
      isHearted: true,
      wordCount: 10,
    },
    {
      commentId: 'comment-8',
      videoId: 'test-video-123',
      author: 'Fiona Green',
      authorAvatarUrl: 'https://example.com/avatar8.jpg',
      authorChannelId: 'channel-8',
      content: 'Can someone explain the part about Redux? I got confused around 10:45.',
      published: '4 days ago',
      publishedDate: Date.now() - 345600000,
      likes: 15,
      viewLikes: '15',
      replyCount: 5,
      replyLevel: 0,
      isAuthorContentCreator: false,
      hasTimestamp: true,
      hasLinks: false,
      isMember: false,
      isDonated: false,
      isHearted: false,
      wordCount: 13,
    },
    {
      commentId: 'comment-9',
      videoId: 'test-video-123',
      author: 'George Martin',
      authorAvatarUrl: 'https://example.com/avatar9.jpg',
      authorChannelId: 'channel-9',
      content: 'Testing 123 - this comment has numbers: 456, 789, 1000.',
      published: '6 hours ago',
      publishedDate: Date.now() - 21600000,
      likes: 7,
      viewLikes: '7',
      replyCount: 1,
      replyLevel: 0,
      isAuthorContentCreator: false,
      hasTimestamp: false,
      hasLinks: false,
      isMember: true,
      isDonated: true,
      isHearted: false,
      donationAmount: '$10.00',
      wordCount: 10,
    },
    {
      commentId: 'comment-10',
      videoId: 'test-video-123',
      author: 'Helen Troy',
      authorAvatarUrl: 'https://example.com/avatar10.jpg',
      authorChannelId: 'channel-10',
      content: 'Special characters test: @mention #hashtag $dollar €euro £pound ¥yen',
      published: '12 hours ago',
      publishedDate: Date.now() - 43200000,
      likes: 0,
      viewLikes: '0',
      replyCount: 0,
      replyLevel: 0,
      isAuthorContentCreator: false,
      hasTimestamp: false,
      hasLinks: false,
      isMember: false,
      isDonated: false,
      isHearted: false,
      wordCount: 9,
    },
    {
      commentId: 'comment-11',
      videoId: 'test-video-123',
      author: 'Minimal User',
      authorAvatarUrl: '',
      authorChannelId: 'channel-11',
      content: 'Minimal fields comment',
      published: '1 min ago',
      publishedDate: Date.now() - 60000,
      likes: 0,
      viewLikes: '0',
      replyCount: 0,
      replyLevel: 0,
      isAuthorContentCreator: false,
      hasTimestamp: false,
      hasLinks: false,
      // Optional fields intentionally omitted
    },
    {
      commentId: 'comment-12',
      videoId: 'test-video-123',
      author: 'Max Values',
      authorAvatarUrl: 'https://example.com/avatar12.jpg',
      authorChannelId: 'channel-12',
      content: 'Extreme values test comment.',
      published: '10 years ago',
      publishedDate: Date.now() - 315360000000,
      likes: 999999,
      viewLikes: '999K',
      replyCount: 9999,
      replyLevel: 0,
      isAuthorContentCreator: true,
      hasTimestamp: true,
      hasLinks: true,
      isMember: true,
      isDonated: true,
      isHearted: true,
      donationAmount: '$999.00',
      wordCount: 999,
    },
  ];

  const mockLiveChatMessages: MockLiveChatMessage[] = [
    {
      id: 'chat-1',
      author: 'ChatUser1',
      message: 'Hello everyone!',
      timestamp: Date.now() - 3600000,
      isMember: false,
      isDonated: false,
    },
    {
      id: 'chat-2',
      author: 'ChatUser2',
      message: 'Great stream!',
      timestamp: Date.now() - 3000000,
      isMember: true,
      isDonated: false,
    },
    {
      id: 'chat-3',
      author: 'ChatUser3',
      message: 'Thanks for the content',
      timestamp: Date.now() - 2400000,
      isMember: false,
      isDonated: true,
    },
    {
      id: 'chat-4',
      author: 'ChatUser4',
      message: 'Question about React hooks?',
      timestamp: Date.now() - 1800000,
      isMember: true,
      isDonated: true,
    },
    {
      id: 'chat-5',
      author: 'ChatUser5',
      message: 'Love the explanation!',
      timestamp: Date.now() - 1200000,
      isMember: false,
      isDonated: false,
    },
  ];

  const mockTranscriptLines: MockTranscriptLine[] = [
    {
      id: 'line-1',
      text: 'Welcome to this tutorial about React testing',
      startTime: 0,
      duration: 5,
    },
    {
      id: 'line-2',
      text: 'Today we will learn about integration tests',
      startTime: 5,
      duration: 4,
    },
    {
      id: 'line-3',
      text: 'First, let me explain the basics of testing',
      startTime: 9,
      duration: 5,
    },
    { id: 'line-4', text: 'We use Vitest as our testing framework', startTime: 14, duration: 4 },
    {
      id: 'line-5',
      text: 'React Testing Library helps us test components',
      startTime: 18,
      duration: 5,
    },
    { id: 'line-6', text: 'Now lets write our first test case', startTime: 23, duration: 4 },
    { id: 'line-7', text: 'Remember to mock external dependencies', startTime: 27, duration: 5 },
    {
      id: 'line-8',
      text: 'Thats all for this tutorial, thanks for watching!',
      startTime: 32,
      duration: 5,
    },
  ];

  // Mutable state for tests
  const mockState = {
    searchKeyword: '',
    filters: {
      sortBy: '',
      sortOrder: 'desc',
      verified: false,
      hasLinks: false,
      keyword: '',
      timestamps: false,
      heart: false,
      links: false,
      members: false,
      donated: false,
      creator: false,
      likesThreshold: { min: 0, max: Infinity },
      repliesLimit: { min: 0, max: Infinity },
      wordCount: { min: 0, max: Infinity },
      dateTimeRange: { start: '', end: '' },
    } as Filters,
    bookmarkedCommentIds: new Set<string>(),
    activeTab: 'comments',
    isSettingsOpen: false,
  };

  // Filter by search keyword
  const filterByKeyword = (
    keyword: string,
    comments: MockComment[] = mockComments
  ): MockComment[] => {
    if (!keyword.trim()) return comments;
    const lowerKeyword = keyword.trim().toLowerCase();
    return comments.filter(
      (c) =>
        c.content.toLowerCase().includes(lowerKeyword) ||
        c.author.toLowerCase().includes(lowerKeyword)
    );
  };

  // Apply all filters
  const filterComments = (comments: MockComment[]): MockComment[] => {
    let result = [...comments];
    const f = mockState.filters;

    if (f.timestamps) result = result.filter((c) => c.hasTimestamp);
    if (f.heart) result = result.filter((c) => c.isHearted);
    if (f.links) result = result.filter((c) => c.hasLinks);
    if (f.members) result = result.filter((c) => c.isMember);
    if (f.donated) result = result.filter((c) => c.isDonated);
    if (f.creator) result = result.filter((c) => c.isAuthorContentCreator);

    if (f.likesThreshold.min > 0) result = result.filter((c) => c.likes >= f.likesThreshold.min);
    if (f.likesThreshold.max < Infinity)
      result = result.filter((c) => c.likes <= f.likesThreshold.max);
    if (f.repliesLimit.min > 0) result = result.filter((c) => c.replyCount >= f.repliesLimit.min);
    if (f.repliesLimit.max < Infinity)
      result = result.filter((c) => c.replyCount <= f.repliesLimit.max);
    if (f.wordCount.min > 0) result = result.filter((c) => (c.wordCount || 0) >= f.wordCount.min);
    if (f.wordCount.max < Infinity)
      result = result.filter((c) => (c.wordCount || 0) <= f.wordCount.max);

    return result;
  };

  // Sort comments
  const sortComments = (comments: MockComment[]): MockComment[] => {
    const { sortBy, sortOrder } = mockState.filters;
    if (!sortBy) return comments;

    const sorted = [...comments];
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    switch (sortBy) {
      case 'likes':
        sorted.sort((a, b) => (a.likes - b.likes) * multiplier);
        break;
      case 'replies':
        sorted.sort((a, b) => (a.replyCount - b.replyCount) * multiplier);
        break;
      case 'date':
        sorted.sort((a, b) => (a.publishedDate - b.publishedDate) * multiplier);
        break;
      case 'author':
        sorted.sort((a, b) => a.author.localeCompare(b.author) * multiplier);
        break;
      case 'length':
        sorted.sort((a, b) => ((a.wordCount || 0) - (b.wordCount || 0)) * multiplier);
        break;
      case 'random':
        sorted.reverse();
        break;
      case 'normalized':
      case 'zscore':
      case 'bayesian':
        // Advanced sorting - sort by likes for testing
        sorted.sort((a, b) => (a.likes - b.likes) * multiplier);
        break;
    }

    return sorted;
  };

  return {
    mockComments,
    mockLiveChatMessages,
    mockTranscriptLines,
    mockState,
    filterByKeyword,
    filterComments,
    sortComments,
  };
});

// Helper to get processed comments
const getProcessedComments = () => {
  let result = filterByKeyword(mockState.searchKeyword);
  result = filterComments(result);
  result = sortComments(result);
  return result;
};

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('i18next', () => ({
  default: { dir: () => 'ltr', language: 'en' },
}));

vi.mock('./features/shared/utils/extractYouTubeVideoIdFromUrl', () => ({
  extractYouTubeVideoIdFromUrl: () => 'test-video-123',
}));

vi.mock('./features/shared/utils/database/database', () => ({
  db: {
    comments: {
      where: () => ({
        equals: () => ({
          count: vi.fn().mockResolvedValue(mockComments.length),
          toArray: vi.fn().mockResolvedValue(mockComments),
        }),
        above: () => ({
          toArray: vi
            .fn()
            .mockImplementation(() =>
              Promise.resolve(
                mockComments.filter((c) => mockState.bookmarkedCommentIds.has(c.commentId))
              )
            ),
        }),
        notEqual: () => ({ toArray: vi.fn().mockResolvedValue([]) }),
      }),
      toArray: vi.fn().mockResolvedValue(mockComments),
      count: vi.fn().mockResolvedValue(mockComments.length),
      put: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('./features/comments/hooks/useCommentsFromDB', () => ({
  useCommentsFromDB: () => ({
    comments: getProcessedComments(),
    totalCount: getProcessedComments().length,
    isLoading: false,
    hasMore: getProcessedComments().length > 10,
    loadMore: vi.fn(),
    refresh: vi.fn(),
    page: 0,
    error: null,
    clearError: vi.fn(),
  }),
  useLiveCommentCount: () => getProcessedComments().length,
  useTotalUnfilteredCount: () => mockComments.length,
  useNewCommentsAvailable: () => false,
  default: () => ({
    comments: getProcessedComments(),
    totalCount: getProcessedComments().length,
    isLoading: false,
    hasMore: false,
    loadMore: vi.fn(),
    refresh: vi.fn(),
    page: 0,
    error: null,
    clearError: vi.fn(),
  }),
}));

vi.mock('./features/shared/utils/database/dbEvents', () => ({
  dbEvents: { onAll: vi.fn(() => vi.fn()), emit: vi.fn() },
}));

vi.mock('./features/shared/hooks/urlChange/useFetchDataOnUrlChange', () => ({
  default: () => {},
}));

vi.mock('./features/comments/hooks/useCommentsIncrementalLoader', () => ({
  default: () => ({ initialLoadCompleted: true }),
}));

vi.mock('./features/transcripts/hooks/useTranscript', () => ({
  default: () => ({ loadTranscript: vi.fn(), transcript: mockTranscriptLines }),
}));

// Mock CommentList
vi.mock('./features/comments/components/CommentList', () => ({
  default: () => {
    const processed = getProcessedComments();
    return (
      <div data-testid="comment-list" data-count={processed.length}>
        {processed.map((comment) => (
          <div
            key={comment.commentId}
            data-testid={`comment-${comment.commentId}`}
            data-likes={comment.likes}
            data-replies={comment.replyCount}
            data-author={comment.author}
            data-wordcount={comment.wordCount || 0}
            data-timestamp={comment.hasTimestamp}
            data-hearted={comment.isHearted}
            data-links={comment.hasLinks}
            data-member={comment.isMember}
            data-donated={comment.isDonated}
            data-creator={comment.isAuthorContentCreator}
            className="comment-item"
          >
            <span data-testid="comment-author">{comment.author}</span>
            <span data-testid="comment-content">{comment.content}</span>
            <span data-testid="comment-likes">{comment.likes}</span>
            <span data-testid="comment-replies">{comment.replyCount}</span>
            <span data-testid="comment-published">{comment.published}</span>

            {/* Action Buttons Mock */}
            <div className="actions">
              <button
                data-testid={`btn-copy-${comment.commentId}`}
                onClick={() => navigator.clipboard.writeText(comment.content)}
                aria-label="Copy comment"
              >
                Copy
              </button>
              <button
                data-testid={`btn-share-${comment.commentId}`}
                onClick={() =>
                  navigator.clipboard.writeText(
                    `https://youtube.com/watch?v=video&lc=${comment.commentId}`
                  )
                }
                aria-label="Share comment"
              >
                Share
              </button>
              <button
                data-testid={`btn-original-${comment.commentId}`}
                onClick={() =>
                  window.open(`https://youtube.com/watch?v=video&lc=${comment.commentId}`, '_blank')
                }
                aria-label="View original"
              >
                Original
              </button>
            </div>
          </div>
        ))}
        {processed.length === 0 && <div data-testid="no-comments">No comments found</div>}
      </div>
    );
  },
}));

// Mock LiveChatList
vi.mock('./features/comments/components/LiveChatList', () => ({
  default: () => (
    <div data-testid="live-chat-list" data-count={mockLiveChatMessages.length}>
      {mockLiveChatMessages.map((msg) => (
        <div
          key={msg.id}
          data-testid={`chat-${msg.id}`}
          data-member={msg.isMember}
          data-donated={msg.isDonated}
        >
          <span data-testid="chat-author">{msg.author}</span>
          <span data-testid="chat-message">{msg.message}</span>
        </div>
      ))}
    </div>
  ),
}));

// Mock BookmarkedComments
vi.mock('./features/comments/components/BookmarkedComments', () => ({
  default: ({ comments }: { comments: MockComment[] }) => {
    const commentsToRender = comments || [];
    return (
      <div data-testid="bookmarked-comments" data-count={commentsToRender.length}>
        {commentsToRender.length === 0 ? (
          <div data-testid="no-bookmarks">No bookmarks yet</div>
        ) : (
          commentsToRender.map((c) => (
            <div key={c.commentId} data-testid={`bookmark-${c.commentId}`}>
              <span data-testid="bookmark-author">{c.author}</span>
              <span data-testid="bookmark-content">{c.content}</span>
            </div>
          ))
        )}
      </div>
    );
  },
}));

// Mock Transcript
vi.mock('./features/transcripts/components/Transcript', () => ({
  default: ({ transcripts }: { transcripts: MockTranscriptLine[] }) => {
    // Use props if available, fallback to mock if null
    const linesToRender = transcripts || [];
    return (
      <div data-testid="transcript" data-count={linesToRender.length}>
        {linesToRender.map((line) => (
          <div key={line.id} data-testid={`transcript-${line.id}`} data-start={line.startTime}>
            <span data-testid="transcript-time">{line.startTime}s</span>
            <span data-testid="transcript-text">{line.text}</span>
          </div>
        ))}
      </div>
    );
  },
}));

// Mock SettingsDrawer with functional settings
vi.mock('./features/settings/components/SettingsDrawer', () => ({
  default: function MockSettingsDrawer({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) {
    const [theme, setTheme] = React.useState(() => {
      try {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        return settings.theme || 'light';
      } catch {
        return 'light';
      }
    });

    const [textSize, setTextSize] = React.useState(() => {
      try {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        return settings.textSize || 'text-base';
      } catch {
        return 'text-base';
      }
    });

    const [language, setLanguage] = React.useState(() => {
      try {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        return settings.language || 'en';
      } catch {
        return 'en';
      }
    });

    const [showContentOnSearch, setShowContentOnSearch] = React.useState(() => {
      try {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        return settings.showContentOnSearch || false;
      } catch {
        return false;
      }
    });

    const saveToLocalStorage = (key: string, value: string | boolean) => {
      try {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        settings[key] = value;
        localStorage.setItem('settings', JSON.stringify(settings));
      } catch {
        // If localStorage is corrupted, create new settings object
        const newSettings = { [key]: value };
        localStorage.setItem('settings', JSON.stringify(newSettings));
      }
    };

    const handleThemeChange = (newTheme: string) => {
      setTheme(newTheme);
      saveToLocalStorage('theme', newTheme);
      // Apply theme class to document
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    const handleTextSizeChange = (newSize: string) => {
      setTextSize(newSize);
      saveToLocalStorage('textSize', newSize);
    };

    const handleLanguageChange = (newLanguage: string) => {
      setLanguage(newLanguage);
      saveToLocalStorage('language', newLanguage);
    };

    const handleToggleContentOnSearch = () => {
      const newValue = !showContentOnSearch;
      setShowContentOnSearch(newValue);
      saveToLocalStorage('showContentOnSearch', newValue);
    };

    return (
      <div data-testid="settings-drawer" data-open={isOpen} role="dialog" aria-modal="true">
        <h2 data-testid="settings-title">Settings</h2>
        <button data-testid="close-settings" onClick={onClose} aria-label="Close settings">
          Close
        </button>
        <div data-testid="theme-setting">
          <button
            data-testid="theme-light"
            onClick={() => handleThemeChange('light')}
            aria-pressed={theme === 'light'}
          >
            Light
          </button>
          <button
            data-testid="theme-dark"
            onClick={() => handleThemeChange('dark')}
            aria-pressed={theme === 'dark'}
          >
            Dark
          </button>
        </div>
        <div data-testid="text-size-setting">
          <button
            data-testid="text-small"
            onClick={() => handleTextSizeChange('text-sm')}
            aria-pressed={textSize === 'text-sm'}
          >
            Small
          </button>
          <button
            data-testid="text-medium"
            onClick={() => handleTextSizeChange('text-base')}
            aria-pressed={textSize === 'text-base'}
          >
            Medium
          </button>
          <button
            data-testid="text-large"
            onClick={() => handleTextSizeChange('text-lg')}
            aria-pressed={textSize === 'text-lg'}
          >
            Large
          </button>
        </div>
        <div data-testid="font-setting">Font Family</div>
        <div data-testid="language-setting">
          <select
            data-testid="language-select"
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </div>
        <div data-testid="show-content-toggle">
          <input
            type="checkbox"
            data-testid="show-content-checkbox"
            checked={showContentOnSearch}
            onChange={handleToggleContentOnSearch}
          />
        </div>
        <div
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onClose();
            }
          }}
          role="button"
          tabIndex={0}
        />
      </div>
    );
  },
}));

// Mock ControlPanel with full functionality
vi.mock('./features/sidebar/components/ControlPanel', () => ({
  default: ({ filters, setFilters }: { filters: Filters; setFilters: (f: Filters) => void }) => {
    const handleFilterChange = (name: keyof Filters) => {
      const newFilters = { ...filters, [name]: !filters[name] };
      setFilters(newFilters);
      mockState.filters = {
        ...mockState.filters,
        [name]: !mockState.filters[name],
      };
    };

    const handleSortChange = (sortBy: string) => {
      const newFilters = { ...filters, sortBy };
      setFilters(newFilters);
      mockState.filters.sortBy = sortBy;
    };

    const handleSortOrderToggle = () => {
      const newOrder = filters.sortOrder === 'asc' ? 'desc' : 'asc';
      setFilters({ ...filters, sortOrder: newOrder });
      mockState.filters.sortOrder = newOrder;
    };

    const handleRangeChange = (
      field: keyof Pick<Filters, 'likesThreshold' | 'repliesLimit' | 'wordCount'>,
      key: 'min' | 'max',
      value: number
    ) => {
      const newValue = { ...(filters[field] || { min: 0, max: Infinity }), [key]: value };
      setFilters({ ...filters, [field]: newValue });
      mockState.filters[field] = newValue;
    };

    const handleClearFilters = () => {
      const cleared = {
        ...filters,
        timestamps: false,
        heart: false,
        links: false,
        members: false,
        donated: false,
        creator: false,
        likesThreshold: { min: 0, max: Infinity },
        repliesLimit: { min: 0, max: Infinity },
        wordCount: { min: 0, max: Infinity },
        sortBy: '',
        sortOrder: 'desc',
      };
      setFilters(cleared);
      mockState.filters = { ...mockState.filters, ...cleared };
    };

    return (
      <div data-testid="control-panel">
        <div data-testid="sort-options" role="group" aria-label="Sort options">
          {[
            'likes',
            'replies',
            'date',
            'author',
            'length',
            'random',
            'normalized',
            'zscore',
            'bayesian',
          ].map((sort) => (
            <button
              key={sort}
              data-testid={`sort-${sort}`}
              onClick={() => handleSortChange(sort)}
              aria-pressed={filters.sortBy === sort}
              className={filters.sortBy === sort ? 'active' : ''}
            >
              Sort by {sort}
            </button>
          ))}
          <button
            data-testid="toggle-sort-order"
            onClick={handleSortOrderToggle}
            aria-label="Toggle sort order"
          >
            {filters.sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
          </button>
        </div>
        <div data-testid="filter-options" role="group" aria-label="Filter options">
          {(
            ['timestamps', 'heart', 'links', 'members', 'donated', 'creator'] as const
          ).map((filter) => (
            <label key={filter}>
              <input
                type="checkbox"
                data-testid={`filter-${filter}`}
                checked={filters[filter] || false}
                onChange={() => handleFilterChange(filter)}
                aria-label={`Filter by ${filter}`}
              />
              {filter}
            </label>
          ))}
        </div>
        <div data-testid="advanced-filters" role="group" aria-label="Advanced filters">
          <div data-testid="likes-range">
            <input
              type="number"
              data-testid="min-likes"
              value={filters.likesThreshold?.min || 0}
              onChange={(e) =>
                handleRangeChange('likesThreshold', 'min', parseInt(e.target.value) || 0)
              }
              aria-label="Minimum likes"
              min="0"
            />
            <input
              type="number"
              data-testid="max-likes"
              value={filters.likesThreshold?.max === Infinity ? '' : filters.likesThreshold?.max}
              onChange={(e) =>
                handleRangeChange(
                  'likesThreshold',
                  'max',
                  e.target.value === '' ? Infinity : parseInt(e.target.value)
                )
              }
              aria-label="Maximum likes"
              min="0"
            />
          </div>
          <div data-testid="replies-range">
            <input
              type="number"
              data-testid="min-replies"
              value={filters.repliesLimit?.min || 0}
              onChange={(e) =>
                handleRangeChange('repliesLimit', 'min', parseInt(e.target.value) || 0)
              }
              aria-label="Minimum replies"
              min="0"
            />
            <input
              type="number"
              data-testid="max-replies"
              value={filters.repliesLimit?.max === Infinity ? '' : filters.repliesLimit?.max}
              onChange={(e) =>
                handleRangeChange(
                  'repliesLimit',
                  'max',
                  e.target.value === '' ? Infinity : parseInt(e.target.value)
                )
              }
              aria-label="Maximum replies"
              min="0"
            />
          </div>
          <div data-testid="words-range">
            <input
              type="number"
              data-testid="min-words"
              value={filters.wordCount?.min || 0}
              onChange={(e) => handleRangeChange('wordCount', 'min', parseInt(e.target.value) || 0)}
              aria-label="Minimum words"
              min="0"
            />
            <input
              type="number"
              data-testid="max-words"
              value={filters.wordCount?.max === Infinity ? '' : filters.wordCount?.max}
              onChange={(e) =>
                handleRangeChange(
                  'wordCount',
                  'max',
                  e.target.value === '' ? Infinity : parseInt(e.target.value)
                )
              }
              aria-label="Maximum words"
              min="0"
            />
          </div>
          <button data-testid="clear-all-filters" onClick={handleClearFilters}>
            Clear All Filters
          </button>
        </div>
      </div>
    );
  },
}));

// Mock NavigationHeader
vi.mock('./features/navigation-header/components/NavigationHeader', () => ({
  default: ({ openSettings }: { openSettings: () => void }) => (
    <header data-testid="navigation-header" role="banner">
      <button onClick={openSettings} data-testid="settings-button" aria-label="Open settings">
        Settings
      </button>
      <h1 data-testid="video-title">Test Video Title</h1>
      <span data-testid="comment-count">{mockComments.length} comments</span>
    </header>
  ),
}));

import App from './App';

// ============================================================================
// Store Factory
// ============================================================================

const createTestStore = (preloadedState = {}) => {
  const initialState = {
    settings: {
      textSize: 'text-base',
      fontFamily: 'Arial',
      showFiltersSorts: true,
      showContentOnSearch: false,
    },
    filters: {
      keyword: '',
      verified: false,
      hasLinks: false,
      sortBy: '',
      sortOrder: 'desc',
      likesThreshold: { min: 0, max: Infinity },
      repliesLimit: { min: 0, max: Infinity },
      wordCount: { min: 0, max: Infinity },
      dateTimeRange: { start: '', end: '' },
      timestamps: false,
      heart: false,
      links: false,
      members: false,
      donated: false,
      creator: false,
    },
    comments: mockComments,
    liveChat: mockLiveChatMessages,
    liveChatState: {
      isLoading: false,
      error: null,
      lastFetchTime: null,
      messageCount: mockLiveChatMessages.length,
      continuationToken: null,
      isReplay: false,
    },
    transcripts: mockTranscriptLines,
    filteredTranscripts: [],
    bookmarkedComments: [],
    bookmarkedLiveChatMessages: [],
    bookmarkedLines: [],
    isLoading: false,
    totalCommentsCount: mockComments.length,
    liveChatMessageCount: mockLiveChatMessages.length,
    showBookmarked: false,
    transcriptSelectedLanguage: { value: '', label: 'Select Language' },
    searchKeyword: '',
    filteredAndSortedComments: [],
    filteredAndSortedBookmarks: [],
    ...preloadedState,
  };

  return configureStore({
    reducer: (state = initialState, action: { type: string; payload?: unknown }) => {
      switch (action.type) {
        case 'comments/setSearchKeyword':
          mockState.searchKeyword = action.payload as string;
          return { ...state, searchKeyword: action.payload as string };
        case 'comments/clearSearchKeyword':
          mockState.searchKeyword = '';
          return { ...state, searchKeyword: '' };
        case 'comments/setFilters':
          return { ...state, filters: action.payload as Filters };
        case 'comments/setShowBookmarked':
          return { ...state, showBookmarked: action.payload as boolean };
        case 'comments/setBookmarkedComments':
          return { ...state, bookmarkedComments: action.payload as MockComment[] };
        default:
          return state;
      }
    },
    preloadedState: initialState,
  });
};

const renderApp = (storeOverrides = {}) => {
  const store = createTestStore(storeOverrides);
  return {
    ...render(
      <Provider store={store}>
        <App />
      </Provider>
    ),
    store,
  };
};

const resetMockState = () => {
  mockState.searchKeyword = '';
  mockState.filters = {
    sortBy: '',
    sortOrder: 'desc',
    verified: false,
    hasLinks: false,
    keyword: '',
    timestamps: false,
    heart: false,
    links: false,
    members: false,
    donated: false,
    creator: false,
    likesThreshold: { min: 0, max: Infinity },
    repliesLimit: { min: 0, max: Infinity },
    wordCount: { min: 0, max: Infinity },
    dateTimeRange: { start: '', end: '' },
  };
  mockState.bookmarkedCommentIds.clear();
  mockState.activeTab = 'comments';
  mockState.isSettingsOpen = false;
};

// ============================================================================
// TESTS - COMPREHENSIVE COVERAGE
// ============================================================================

describe('App Integration Tests - Complete Coverage', () => {
  beforeEach(() => {
    resetMockState();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // 1. INITIAL RENDER & BASIC UI
  // ==========================================================================

  describe('1. Initial Render & Basic UI', () => {
    it('renders application without errors', () => {
      renderApp();
      expect(screen.getByTestId('navigation-header')).toBeInTheDocument();
    });

    it('displays navigation header with video title', () => {
      renderApp();
      expect(screen.getByTestId('video-title')).toHaveTextContent('Test Video Title');
    });

    it('displays search bar with placeholder', () => {
      renderApp();
      expect(screen.getByPlaceholderText('Search everything...')).toBeInTheDocument();
    });

    it('displays all 10 comments initially', () => {
      renderApp();
      for (let i = 1; i <= 12; i++) {
        expect(screen.getByTestId(`comment-comment-${i}`)).toBeInTheDocument();
      }
    });

    it('displays correct total count in header', () => {
      renderApp();
      expect(screen.getByText(/Comments \(12\)/)).toBeInTheDocument();
    });

    it('displays control panel', () => {
      renderApp();
      expect(screen.getByTestId('control-panel')).toBeInTheDocument();
    });

    it('displays sort options', () => {
      renderApp();
      expect(screen.getByTestId('sort-options')).toBeInTheDocument();
    });

    it('displays filter options', () => {
      renderApp();
      expect(screen.getByTestId('filter-options')).toBeInTheDocument();
    });

    it('displays advanced filters', () => {
      renderApp();
      expect(screen.getByTestId('advanced-filters')).toBeInTheDocument();
    });

    it('settings drawer is closed initially', () => {
      renderApp();
      expect(screen.getByTestId('settings-drawer')).toHaveAttribute('data-open', 'false');
    });
  });

  // ==========================================================================
  // 2. SEARCH FUNCTIONALITY - COMPREHENSIVE
  // ==========================================================================

  describe('2. Search Functionality', () => {
    describe('2.1 Basic Search', () => {
      it('filters by exact word match', async () => {
        renderApp();
        fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
          target: { value: 'React' },
        });
        fireEvent.click(screen.getByLabelText('Submit search'));
        await waitFor(() => {
          expect(screen.getByTestId('comment-comment-1')).toBeInTheDocument();
          expect(screen.getByTestId('comment-comment-7')).toBeInTheDocument();
        });
      });

      it('filters by partial word', async () => {
        renderApp();
        fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
          target: { value: 'test' },
        });
        fireEvent.click(screen.getByLabelText('Submit search'));
        await waitFor(() => {
          expect(screen.getByTestId('comment-comment-1')).toBeInTheDocument();
          expect(screen.getByTestId('comment-comment-9')).toBeInTheDocument();
          expect(screen.getByTestId('comment-comment-10')).toBeInTheDocument();
        });
      });

      it('filters by author name', async () => {
        renderApp();
        fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
          target: { value: 'Jane' },
        });
        fireEvent.click(screen.getByLabelText('Submit search'));
        await waitFor(() => {
          expect(screen.getByTestId('comment-comment-2')).toBeInTheDocument();
          expect(screen.queryByTestId('comment-comment-1')).not.toBeInTheDocument();
        });
      });

      it('is case insensitive', async () => {
        renderApp();
        fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
          target: { value: 'JAVASCRIPT' },
        });
        fireEvent.click(screen.getByLabelText('Submit search'));
        await waitFor(() => {
          expect(screen.getByTestId('comment-comment-3')).toBeInTheDocument();
        });
      });

      it('handles mixed case search', async () => {
        renderApp();
        fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
          target: { value: 'JaVaScRiPt' },
        });
        fireEvent.click(screen.getByLabelText('Submit search'));
        await waitFor(() => {
          expect(screen.getByTestId('comment-comment-3')).toBeInTheDocument();
        });
      });
    });

    describe('2.2 Special Character Search', () => {
      it('searches for URLs', async () => {
        renderApp();
        fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
          target: { value: 'https://' },
        });
        fireEvent.click(screen.getByLabelText('Submit search'));
        await waitFor(() => {
          expect(screen.getByTestId('comment-comment-1')).toBeInTheDocument();
          expect(screen.getByTestId('comment-comment-6')).toBeInTheDocument();
        });
      });

      it('searches for emojis', async () => {
        renderApp();
        fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
          target: { value: '🎉' },
        });
        fireEvent.click(screen.getByLabelText('Submit search'));
        await waitFor(() => {
          expect(screen.getByTestId('comment-comment-1')).toBeInTheDocument();
        });
      });

      it('searches for @ mentions', async () => {
        renderApp();
        fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
          target: { value: '@mention' },
        });
        fireEvent.click(screen.getByLabelText('Submit search'));
        await waitFor(() => {
          expect(screen.getByTestId('comment-comment-10')).toBeInTheDocument();
        });
      });

      it('searches for hashtags', async () => {
        renderApp();
        fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
          target: { value: '#hashtag' },
        });
        fireEvent.click(screen.getByLabelText('Submit search'));
        await waitFor(() => {
          expect(screen.getByTestId('comment-comment-10')).toBeInTheDocument();
        });
      });

      it('searches for currency symbols', async () => {
        renderApp();
        fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
          target: { value: '€euro' },
        });
        fireEvent.click(screen.getByLabelText('Submit search'));
        await waitFor(() => {
          expect(screen.getByTestId('comment-comment-10')).toBeInTheDocument();
        });
      });

      it('searches for numbers', async () => {
        renderApp();
        fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
          target: { value: '123' },
        });
        fireEvent.click(screen.getByLabelText('Submit search'));
        await waitFor(() => {
          expect(screen.getByTestId('comment-comment-9')).toBeInTheDocument();
        });
      });
    });

    describe('2.3 Search Edge Cases', () => {
      it('handles empty search', async () => {
        renderApp();
        fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
          target: { value: '' },
        });
        fireEvent.click(screen.getByLabelText('Submit search'));
        await waitFor(() => {
          expect(screen.getAllByTestId(/^comment-comment-/).length).toBe(12);
        });
      });

      it('handles whitespace-only search', async () => {
        renderApp();
        fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
          target: { value: '   ' },
        });
        fireEvent.click(screen.getByLabelText('Submit search'));
        await waitFor(() => {
          expect(screen.getAllByTestId(/^comment-comment-/).length).toBe(12);
        });
      });

      it('shows no results for non-existent term', async () => {
        renderApp();
        fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
          target: { value: 'xyznonexistent999' },
        });
        fireEvent.click(screen.getByLabelText('Submit search'));
        await waitFor(() => {
          expect(screen.getByTestId('no-comments')).toBeInTheDocument();
        });
      });

      it('clears search and restores all comments', async () => {
        renderApp();
        fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
          target: { value: 'React' },
        });
        fireEvent.click(screen.getByLabelText('Submit search'));
        await waitFor(() =>
          expect(screen.queryByTestId('comment-comment-5')).not.toBeInTheDocument()
        );
        fireEvent.click(screen.getByLabelText('Clear search'));
        await waitFor(() => {
          expect(screen.getAllByTestId(/^comment-comment-/).length).toBe(12);
        });
      });

      it('handles very long search terms', async () => {
        renderApp();
        const longTerm = 'a'.repeat(100);
        fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
          target: { value: longTerm },
        });
        fireEvent.click(screen.getByLabelText('Submit search'));
        await waitFor(() => {
          expect(screen.getByTestId('no-comments')).toBeInTheDocument();
        });
      });

      it('handles search with leading/trailing spaces', async () => {
        renderApp();
        fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
          target: { value: '  React  ' },
        });
        fireEvent.click(screen.getByLabelText('Submit search'));
        await waitFor(() => {
          expect(screen.getByTestId('comment-comment-1')).toBeInTheDocument();
        });
      });
    });

    describe('2.4 Search Form Interactions', () => {
      it('submits search on Enter key', async () => {
        renderApp();
        const input = screen.getByPlaceholderText('Search everything...');
        fireEvent.change(input, { target: { value: 'React' } });
        fireEvent.submit(input.closest('form')!);
        await waitFor(() => {
          expect(screen.getByTestId('comment-comment-1')).toBeInTheDocument();
        });
      });

      it('updates input value as user types', () => {
        renderApp();
        const input = screen.getByPlaceholderText('Search everything...');
        fireEvent.change(input, { target: { value: 'test' } });
        expect(input).toHaveValue('test');
      });

      it('clear button resets input value', async () => {
        renderApp();
        const input = screen.getByPlaceholderText('Search everything...');
        fireEvent.change(input, { target: { value: 'test' } });
        fireEvent.click(screen.getByLabelText('Submit search'));
        await waitFor(() => {});
        fireEvent.click(screen.getByLabelText('Clear search'));
        expect(input).toHaveValue('');
      });

      it('searches within transcript tab', async () => {
        renderApp();
        fireEvent.click(screen.getByText(/Transcript/));
        fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
          target: { value: 'React' },
        });
        fireEvent.click(screen.getByLabelText('Submit search'));
        await waitFor(() => {
          expect(screen.getByTestId('transcript-line-1')).toBeInTheDocument();
          expect(screen.getByTestId('transcript-line-5')).toBeInTheDocument();
          // Filtered out
          expect(screen.queryByTestId('transcript-line-2')).not.toBeInTheDocument();
        });
      });
    });
  });

  // ==========================================================================
  // 3. CHECKBOX FILTERS - ALL COMBINATIONS
  // ==========================================================================

  describe('3. Checkbox Filters', () => {
    describe('3.1 Individual Filters', () => {
      it('filters by timestamps', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('filter-timestamps'));
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          comments.forEach((c) => expect(c).toHaveAttribute('data-timestamp', 'true'));
        });
      });

      it('filters by hearted', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('filter-heart'));
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          comments.forEach((c) => expect(c).toHaveAttribute('data-hearted', 'true'));
        });
      });

      it('filters by links', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('filter-links'));
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          comments.forEach((c) => expect(c).toHaveAttribute('data-links', 'true'));
        });
      });

      it('filters by members', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('filter-members'));
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          comments.forEach((c) => expect(c).toHaveAttribute('data-member', 'true'));
        });
      });

      it('filters by donated', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('filter-donated'));
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          comments.forEach((c) => expect(c).toHaveAttribute('data-donated', 'true'));
        });
      });

      it('filters by creator', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('filter-creator'));
        await waitFor(() => {
          expect(screen.getByTestId('comment-comment-4')).toBeInTheDocument();
          expect(screen.queryByTestId('comment-comment-1')).not.toBeInTheDocument();
        });
      });
    });

    describe('3.2 Multiple Filter Combinations', () => {
      it('timestamps + hearted', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('filter-timestamps'));
        fireEvent.click(screen.getByTestId('filter-heart'));
        await waitFor(() => {
          expect(screen.getByTestId('comment-comment-1')).toBeInTheDocument();
          expect(screen.queryByTestId('comment-comment-2')).not.toBeInTheDocument();
        });
      });

      it('members + donated', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('filter-members'));
        fireEvent.click(screen.getByTestId('filter-donated'));
        await waitFor(() => {
          expect(screen.getByTestId('comment-comment-6')).toBeInTheDocument();
          expect(screen.getByTestId('comment-comment-9')).toBeInTheDocument();
        });
      });

      it('hearted + members + donated', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('filter-heart'));
        fireEvent.click(screen.getByTestId('filter-members'));
        fireEvent.click(screen.getByTestId('filter-donated'));
        await waitFor(() => {
          expect(screen.getByTestId('comment-comment-6')).toBeInTheDocument();
          expect(screen.queryByTestId('comment-comment-1')).not.toBeInTheDocument();
        });
      });

      it('all filters enabled shows comment-12', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('filter-timestamps'));
        fireEvent.click(screen.getByTestId('filter-heart'));
        fireEvent.click(screen.getByTestId('filter-links'));
        fireEvent.click(screen.getByTestId('filter-members'));
        fireEvent.click(screen.getByTestId('filter-donated'));
        fireEvent.click(screen.getByTestId('filter-creator'));
        await waitFor(() => {
          expect(screen.getByTestId('comment-comment-12')).toBeInTheDocument();
        });
      });
    });

    describe('3.3 Filter Toggle Behavior', () => {
      it('toggle filter on then off restores results', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('filter-creator'));
        await waitFor(() =>
          expect(screen.queryByTestId('comment-comment-1')).not.toBeInTheDocument()
        );
        fireEvent.click(screen.getByTestId('filter-creator'));
        await waitFor(() => expect(screen.getByTestId('comment-comment-1')).toBeInTheDocument());
      });

      it('rapid toggling works correctly', async () => {
        renderApp();
        for (let i = 0; i < 5; i++) {
          fireEvent.click(screen.getByTestId('filter-heart'));
        }
        // 5 clicks = filter is on
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          comments.forEach((c) => expect(c).toHaveAttribute('data-hearted', 'true'));
        });
      });

      it('clear all filters button works', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('filter-heart'));
        fireEvent.click(screen.getByTestId('filter-members'));
        await waitFor(() =>
          expect(screen.getAllByTestId(/^comment-comment-/).length).toBeLessThan(10)
        );
        fireEvent.click(screen.getByTestId('clear-all-filters'));
        await waitFor(() => expect(screen.getAllByTestId(/^comment-comment-/).length).toBe(12));
      });
    });
  });

  // ==========================================================================
  // 4. SORTING - ALL OPTIONS
  // ==========================================================================

  describe('4. Sorting', () => {
    describe('4.1 Basic Sort Options', () => {
      it('sorts by likes descending', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('sort-likes'));
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          expect(comments[0]).toHaveAttribute('data-likes', '999999');
          expect(comments[1]).toHaveAttribute('data-likes', '500');
        });
      });

      it('sorts by likes ascending', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('sort-likes'));
        fireEvent.click(screen.getByTestId('toggle-sort-order'));
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          expect(comments[0]).toHaveAttribute('data-likes', '0');
          expect(comments[1]).toHaveAttribute('data-likes', '0');
        });
      });

      it('sorts by replies descending', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('sort-replies'));
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          expect(comments[0]).toHaveAttribute('data-replies', '9999');
        });
      });

      it('sorts by replies ascending', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('sort-replies'));
        fireEvent.click(screen.getByTestId('toggle-sort-order'));
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          expect(comments[0]).toHaveAttribute('data-replies', '0');
        });
      });

      it('sorts by date (newest first)', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('sort-date'));
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          expect(comments[0]).toHaveAttribute('data-testid', 'comment-comment-11');
        });
      });

      it('sorts by date (oldest first)', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('sort-date'));
        fireEvent.click(screen.getByTestId('toggle-sort-order'));
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          expect(comments[0]).toHaveAttribute('data-testid', 'comment-comment-12');
        });
      });

      it('sorts by author A-Z', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('sort-author'));
        fireEvent.click(screen.getByTestId('toggle-sort-order'));
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          expect(comments[0]).toHaveAttribute('data-author', 'Alice Johnson');
        });
      });

      it('sorts by author Z-A', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('sort-author'));
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          expect(comments[0]).toHaveAttribute('data-author', 'Minimal User');
        });
      });

      it('sorts by length (longest first)', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('sort-length'));
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          expect(comments[0]).toHaveAttribute('data-wordcount', '999');
        });
      });

      it('sorts by length (shortest first)', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('sort-length'));
        fireEvent.click(screen.getByTestId('toggle-sort-order'));
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          expect(comments[0]).toHaveAttribute('data-wordcount', '0');
        });
      });

      it('random sort changes order', async () => {
        renderApp();
        const before = screen
          .getAllByTestId(/^comment-comment-/)
          .map((c) => c.getAttribute('data-testid'));
        fireEvent.click(screen.getByTestId('sort-random'));
        await waitFor(() => {
          const after = screen
            .getAllByTestId(/^comment-comment-/)
            .map((c) => c.getAttribute('data-testid'));
          expect(after).not.toEqual(before);
        });
      });
    });

    describe('4.2 Advanced Sort Options', () => {
      it('sorts by normalized score', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('sort-normalized'));
        await waitFor(() => {
          expect(screen.getAllByTestId(/^comment-comment-/).length).toBe(12);
        });
      });

      it('sorts by weighted z-score', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('sort-zscore'));
        await waitFor(() => {
          expect(screen.getAllByTestId(/^comment-comment-/).length).toBe(12);
        });
      });

      it('sorts by bayesian average', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('sort-bayesian'));
        await waitFor(() => {
          expect(screen.getAllByTestId(/^comment-comment-/).length).toBe(12);
        });
      });
    });

    describe('4.3 Sort Switching', () => {
      it('switches between sort options', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('sort-likes'));
        await waitFor(() =>
          expect(screen.getAllByTestId(/^comment-comment-/)[0]).toHaveAttribute(
            'data-likes',
            '999999'
          )
        );
        fireEvent.click(screen.getByTestId('sort-replies'));
        await waitFor(() =>
          expect(screen.getAllByTestId(/^comment-comment-/)[0]).toHaveAttribute(
            'data-replies',
            '9999'
          )
        );
      });

      it('multiple sort order toggles', async () => {
        renderApp();
        fireEvent.click(screen.getByTestId('sort-likes'));
        for (let i = 0; i < 4; i++) {
          fireEvent.click(screen.getByTestId('toggle-sort-order'));
        }
        // Even number of toggles = back to desc
        await waitFor(() => {
          expect(screen.getAllByTestId(/^comment-comment-/)[0]).toHaveAttribute(
            'data-likes',
            '999999'
          );
        });
      });
    });
  });

  // ==========================================================================
  // 5. RANGE FILTERS - COMPREHENSIVE
  // ==========================================================================

  describe('5. Range Filters', () => {
    describe('5.1 Likes Range', () => {
      it('minimum likes filter', async () => {
        renderApp();
        fireEvent.change(screen.getByTestId('min-likes'), { target: { value: '100' } });
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          comments.forEach((c) =>
            expect(parseInt(c.getAttribute('data-likes')!)).toBeGreaterThanOrEqual(100)
          );
        });
      });

      it('maximum likes filter', async () => {
        renderApp();
        fireEvent.change(screen.getByTestId('max-likes'), { target: { value: '50' } });
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          comments.forEach((c) =>
            expect(parseInt(c.getAttribute('data-likes')!)).toBeLessThanOrEqual(50)
          );
        });
      });

      it('likes range (min and max)', async () => {
        renderApp();
        fireEvent.change(screen.getByTestId('min-likes'), { target: { value: '20' } });
        fireEvent.change(screen.getByTestId('max-likes'), { target: { value: '100' } });
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          comments.forEach((c) => {
            const likes = parseInt(c.getAttribute('data-likes')!);
            expect(likes).toBeGreaterThanOrEqual(20);
            expect(likes).toBeLessThanOrEqual(100);
          });
        });
      });

      it('exact likes match', async () => {
        renderApp();
        fireEvent.change(screen.getByTestId('min-likes'), { target: { value: '150' } });
        fireEvent.change(screen.getByTestId('max-likes'), { target: { value: '150' } });
        await waitFor(() => {
          expect(screen.getByTestId('comment-comment-1')).toBeInTheDocument();
          expect(screen.getAllByTestId(/^comment-comment-/).length).toBe(1);
        });
      });

      it('impossible range shows no results', async () => {
        renderApp();
        fireEvent.change(screen.getByTestId('min-likes'), { target: { value: '1000000' } });
        await waitFor(() => {
          expect(screen.getByTestId('no-comments')).toBeInTheDocument();
        });
      });
    });

    describe('5.2 Replies Range', () => {
      it('minimum replies filter', async () => {
        renderApp();
        fireEvent.change(screen.getByTestId('min-replies'), { target: { value: '10' } });
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          comments.forEach((c) =>
            expect(parseInt(c.getAttribute('data-replies')!)).toBeGreaterThanOrEqual(10)
          );
        });
      });

      it('maximum replies filter', async () => {
        renderApp();
        fireEvent.change(screen.getByTestId('max-replies'), { target: { value: '5' } });
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          comments.forEach((c) =>
            expect(parseInt(c.getAttribute('data-replies')!)).toBeLessThanOrEqual(5)
          );
        });
      });

      it('zero replies filter', async () => {
        renderApp();
        fireEvent.change(screen.getByTestId('max-replies'), { target: { value: '0' } });
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          comments.forEach((c) => expect(c.getAttribute('data-replies')).toBe('0'));
        });
      });
    });

    describe('5.3 Word Count Range', () => {
      it('minimum words filter', async () => {
        renderApp();
        fireEvent.change(screen.getByTestId('min-words'), { target: { value: '15' } });
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          comments.forEach((c) =>
            expect(parseInt(c.getAttribute('data-wordcount')!)).toBeGreaterThanOrEqual(15)
          );
        });
      });

      it('maximum words filter', async () => {
        renderApp();
        fireEvent.change(screen.getByTestId('max-words'), { target: { value: '10' } });
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          comments.forEach((c) =>
            expect(parseInt(c.getAttribute('data-wordcount')!)).toBeLessThanOrEqual(10)
          );
        });
      });

      it('word count range', async () => {
        renderApp();
        fireEvent.change(screen.getByTestId('min-words'), { target: { value: '10' } });
        fireEvent.change(screen.getByTestId('max-words'), { target: { value: '15' } });
        await waitFor(() => {
          const comments = screen.getAllByTestId(/^comment-comment-/);
          comments.forEach((c) => {
            const wc = parseInt(c.getAttribute('data-wordcount')!);
            expect(wc).toBeGreaterThanOrEqual(10);
            expect(wc).toBeLessThanOrEqual(15);
          });
        });
      });
    });

    describe('5.4 Range Edge Cases', () => {
      it('zero as minimum', async () => {
        renderApp();
        fireEvent.change(screen.getByTestId('min-likes'), { target: { value: '0' } });
        await waitFor(() => {
          expect(screen.getAllByTestId(/^comment-comment-/).length).toBe(12);
        });
      });

      it('clearing max restores infinity', async () => {
        renderApp();
        fireEvent.change(screen.getByTestId('max-likes'), { target: { value: '50' } });
        await waitFor(() =>
          expect(screen.getAllByTestId(/^comment-comment-/).length).toBeLessThan(10)
        );
        fireEvent.change(screen.getByTestId('max-likes'), { target: { value: '' } });
        await waitFor(() => expect(screen.getAllByTestId(/^comment-comment-/).length).toBe(12));
      });
    });
  });

  // ==========================================================================
  // 6. COMBINED OPERATIONS
  // ==========================================================================

  describe('6. Combined Operations', () => {
    it('search + checkbox filter', async () => {
      renderApp();
      fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
        target: { value: 'video' },
      });
      fireEvent.click(screen.getByLabelText('Submit search'));
      fireEvent.click(screen.getByTestId('filter-members'));
      await waitFor(() => {
        expect(screen.getByTestId('comment-comment-2')).toBeInTheDocument();
        expect(screen.queryByTestId('comment-comment-1')).not.toBeInTheDocument();
      });
    });

    it('search + sort', async () => {
      renderApp();
      fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
        target: { value: 'the' },
      });
      fireEvent.click(screen.getByLabelText('Submit search'));
      fireEvent.click(screen.getByTestId('sort-likes'));
      await waitFor(() => {
        const comments = screen.getAllByTestId(/^comment-comment-/);
        for (let i = 1; i < comments.length; i++) {
          expect(parseInt(comments[i - 1].getAttribute('data-likes')!)).toBeGreaterThanOrEqual(
            parseInt(comments[i].getAttribute('data-likes')!)
          );
        }
      });
    });

    it('checkbox filter + sort', async () => {
      renderApp();
      fireEvent.click(screen.getByTestId('filter-heart'));
      fireEvent.click(screen.getByTestId('sort-likes'));
      await waitFor(() => {
        const comments = screen.getAllByTestId(/^comment-comment-/);
        comments.forEach((c) => expect(c).toHaveAttribute('data-hearted', 'true'));
        expect(comments[0]).toHaveAttribute('data-likes', '999999');
      });
    });
    it('range filter + sort', async () => {
      renderApp();
      fireEvent.change(screen.getByTestId('min-likes'), { target: { value: '50' } });
      fireEvent.click(screen.getByTestId('sort-replies'));
      await waitFor(() => {
        const comments = screen.getAllByTestId(/^comment-comment-/);
        comments.forEach((c) =>
          expect(parseInt(c.getAttribute('data-likes')!)).toBeGreaterThanOrEqual(50)
        );
      });
    });

    it('search + checkbox + range + sort', async () => {
      renderApp();
      fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
        target: { value: 'video' },
      });
      fireEvent.click(screen.getByLabelText('Submit search'));
      fireEvent.click(screen.getByTestId('filter-timestamps'));
      fireEvent.change(screen.getByTestId('min-likes'), { target: { value: '10' } });
      fireEvent.click(screen.getByTestId('sort-likes'));
      await waitFor(() => {
        const comments = screen.getAllByTestId(/^comment-comment-/);
        expect(comments.length).toBeGreaterThan(0);
      });
    });

    it('multiple checkbox + multiple range', async () => {
      renderApp();
      fireEvent.click(screen.getByTestId('filter-heart'));
      fireEvent.change(screen.getByTestId('min-likes'), { target: { value: '50' } });
      fireEvent.change(screen.getByTestId('min-replies'), { target: { value: '5' } });
      await waitFor(() => {
        const comments = screen.getAllByTestId(/^comment-comment-/);
        comments.forEach((c) => {
          expect(c).toHaveAttribute('data-hearted', 'true');
          expect(parseInt(c.getAttribute('data-likes')!)).toBeGreaterThanOrEqual(50);
          expect(parseInt(c.getAttribute('data-replies')!)).toBeGreaterThanOrEqual(5);
        });
      });
    });
  });

  // ==========================================================================
  // 7. TAB NAVIGATION
  // ==========================================================================

  describe('7. Tab Navigation', () => {
    it('comments tab is default', () => {
      renderApp();
      expect(screen.getByTestId('comment-list')).toBeInTheDocument();
    });

    it('switches to transcript tab', async () => {
      renderApp();
      fireEvent.click(screen.getByText(/Transcript/));
      await waitFor(() => {
        expect(screen.getByTestId('transcript')).toBeInTheDocument();
        expect(screen.queryByTestId('comment-list')).not.toBeInTheDocument();
      });
    });

    it('switches to live chat tab', async () => {
      renderApp();
      fireEvent.click(screen.getByText(/Live Chat/));
      await waitFor(() => {
        expect(screen.getByTestId('live-chat-list')).toBeInTheDocument();
      });
    });

    it('switches to bookmarks tab', async () => {
      renderApp();
      fireEvent.click(screen.getByText(/Bookmarks/));
      await waitFor(() => {
        expect(screen.getByTestId('bookmarked-comments')).toBeInTheDocument();
      });
    });

    it('returns to comments from transcript', async () => {
      renderApp();
      fireEvent.click(screen.getByText(/Transcript/));
      await waitFor(() => expect(screen.getByTestId('transcript')).toBeInTheDocument());
      fireEvent.click(screen.getByText(/Comments/));
      await waitFor(() => expect(screen.getByTestId('comment-list')).toBeInTheDocument());
    });

    it('rapid tab switching works', async () => {
      renderApp();
      fireEvent.click(screen.getByText(/Transcript/));
      fireEvent.click(screen.getByText(/Live Chat/));
      fireEvent.click(screen.getByText(/Bookmarks/));
      fireEvent.click(screen.getByText(/Comments/));
      await waitFor(() => expect(screen.getByTestId('comment-list')).toBeInTheDocument());
    });
  });

  // ==========================================================================
  // 8. LIVE CHAT
  // ==========================================================================

  describe('8. Live Chat', () => {
    it('displays all live chat messages', async () => {
      renderApp();
      fireEvent.click(screen.getByText(/Live Chat/));
      await waitFor(() => {
        for (let i = 1; i <= 5; i++) {
          expect(screen.getByTestId(`chat-chat-${i}`)).toBeInTheDocument();
        }
      });
    });

    it('displays chat message count', async () => {
      renderApp();
      fireEvent.click(screen.getByText(/Live Chat/));
      await waitFor(() => {
        expect(screen.getByTestId('live-chat-list')).toHaveAttribute('data-count', '5');
      });
    });

    it('displays member chat messages', async () => {
      renderApp();
      fireEvent.click(screen.getByText(/Live Chat/));
      await waitFor(() => {
        expect(screen.getByTestId('chat-chat-2')).toHaveAttribute('data-member', 'true');
      });
    });

    it('displays donated chat messages', async () => {
      renderApp();
      fireEvent.click(screen.getByText(/Live Chat/));
      await waitFor(() => {
        expect(screen.getByTestId('chat-chat-3')).toHaveAttribute('data-donated', 'true');
      });
    });

    it('searches within live chat', async () => {
      renderApp();
      fireEvent.click(screen.getByText(/Live Chat/));
      fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
        target: { value: 'Hello' },
      });
      fireEvent.click(screen.getByLabelText('Submit search'));
      await waitFor(() => {
        expect(screen.getByTestId('chat-chat-1')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // 9. TRANSCRIPT
  // ==========================================================================

  describe('9. Transcript', () => {
    it('displays all transcript lines', async () => {
      renderApp();
      fireEvent.click(screen.getByText(/Transcript/));
      await waitFor(() => {
        for (let i = 1; i <= 8; i++) {
          expect(screen.getByTestId(`transcript-line-${i}`)).toBeInTheDocument();
        }
      });
    });

    it('displays transcript line count', async () => {
      renderApp();
      fireEvent.click(screen.getByText(/Transcript/));
      await waitFor(() => {
        expect(screen.getByTestId('transcript')).toHaveAttribute('data-count', '8');
      });
    });

    it('displays transcript timestamps', async () => {
      renderApp();
      fireEvent.click(screen.getByText(/Transcript/));
      await waitFor(() => {
        expect(screen.getByTestId('transcript-line-1')).toHaveAttribute('data-start', '0');
      });
    });
  });

  // ==========================================================================
  // 10. BOOKMARKS
  // ==========================================================================

  describe('10. Bookmarks', () => {
    it('shows no bookmarks initially', async () => {
      renderApp();
      fireEvent.click(screen.getByText(/Bookmarks/));
      await waitFor(() => {
        expect(screen.getByTestId('no-bookmarks')).toBeInTheDocument();
      });
    });

    it('displays bookmarked comments', async () => {
      mockState.bookmarkedCommentIds.add('comment-1');
      mockState.bookmarkedCommentIds.add('comment-3');
      renderApp();
      fireEvent.click(screen.getByText(/Bookmarks/));
      await waitFor(() => {
        expect(screen.getByTestId('bookmark-comment-1')).toBeInTheDocument();
        expect(screen.getByTestId('bookmark-comment-3')).toBeInTheDocument();
      });
    });

    it('shows correct bookmark count', async () => {
      mockState.bookmarkedCommentIds.add('comment-1');
      mockState.bookmarkedCommentIds.add('comment-2');
      mockState.bookmarkedCommentIds.add('comment-3');
      renderApp();
      fireEvent.click(screen.getByText(/Bookmarks/));
      await waitFor(() => {
        expect(screen.getByTestId('bookmarked-comments')).toHaveAttribute('data-count', '3');
      });
    });

    it('displays bookmark content', async () => {
      mockState.bookmarkedCommentIds.add('comment-1');

      renderApp();

      fireEvent.click(screen.getByText(/Bookmarks/));

      await waitFor(() => {
        expect(screen.getByTestId('bookmark-comment-1')).toBeInTheDocument();

        expect(
          within(screen.getByTestId('bookmark-comment-1')).getByTestId('bookmark-author')
        ).toHaveTextContent('John Doe');
      });
    });

    it('searches within bookmarks', async () => {
      mockState.bookmarkedCommentIds.add('comment-1');

      mockState.bookmarkedCommentIds.add('comment-2');

      renderApp();

      fireEvent.click(screen.getByText(/Bookmarks/));

      fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
        target: { value: 'tutorial' },
      });

      fireEvent.click(screen.getByLabelText('Submit search'));

      await waitFor(() => {
        expect(screen.getByTestId('bookmark-comment-1')).toBeInTheDocument();

        expect(screen.queryByTestId('bookmark-comment-2')).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // 11. SETTINGS
  // ==========================================================================

  describe('11. Settings', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('opens settings drawer', async () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));
      await waitFor(() => {
        expect(screen.getByTestId('settings-drawer')).toHaveAttribute('data-open', 'true');
      });
    });

    it('closes settings drawer', async () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));
      await waitFor(() =>
        expect(screen.getByTestId('settings-drawer')).toHaveAttribute('data-open', 'true')
      );
      fireEvent.click(screen.getByTestId('close-settings'));
      await waitFor(() =>
        expect(screen.getByTestId('settings-drawer')).toHaveAttribute('data-open', 'false')
      );
    });

    it('displays theme settings', () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));
      expect(screen.getByTestId('theme-setting')).toBeInTheDocument();
      expect(screen.getByTestId('theme-light')).toBeInTheDocument();
      expect(screen.getByTestId('theme-dark')).toBeInTheDocument();
    });

    it('displays text size settings', () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));
      expect(screen.getByTestId('text-size-setting')).toBeInTheDocument();
    });

    it('displays font settings', () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));
      expect(screen.getByTestId('font-setting')).toBeInTheDocument();
    });

    it('displays language settings', () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));
      expect(screen.getByTestId('language-setting')).toBeInTheDocument();
    });

    it('settings drawer has correct role', () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));
      expect(screen.getByTestId('settings-drawer')).toHaveAttribute('role', 'dialog');
    });

    // ========================================================================
    // Theme Setting Tests
    // ========================================================================

    it('changes theme from light to dark', async () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));

      // Click dark theme button
      fireEvent.click(screen.getByTestId('theme-dark'));

      await waitFor(() => {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        expect(settings.theme).toBe('dark');
      });
    });

    it('changes theme from dark to light', async () => {
      // Set initial dark theme
      localStorage.setItem('settings', JSON.stringify({ theme: 'dark' }));

      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));

      // Click light theme button
      fireEvent.click(screen.getByTestId('theme-light'));

      await waitFor(() => {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        expect(settings.theme).toBe('light');
      });
    });

    it('persists theme setting in localStorage', async () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));
      fireEvent.click(screen.getByTestId('theme-dark'));

      await waitFor(() => {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        expect(settings.theme).toBe('dark');
      });
    });

    it('applies dark theme class to document element', async () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));
      fireEvent.click(screen.getByTestId('theme-dark'));

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });

    it('removes dark theme class when switching to light', async () => {
      // Set initial dark theme
      document.documentElement.classList.add('dark');
      localStorage.setItem('settings', JSON.stringify({ theme: 'dark' }));

      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));
      fireEvent.click(screen.getByTestId('theme-light'));

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });
    });

    // ========================================================================
    // Text Size Setting Tests
    // ========================================================================

    it('changes text size to small', async () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));
      fireEvent.click(screen.getByTestId('text-small'));

      await waitFor(() => {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        expect(settings.textSize).toBe('text-sm');
      });
    });

    it('changes text size to medium', async () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));
      fireEvent.click(screen.getByTestId('text-medium'));

      await waitFor(() => {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        expect(settings.textSize).toBe('text-base');
      });
    });

    it('changes text size to large', async () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));
      fireEvent.click(screen.getByTestId('text-large'));

      await waitFor(() => {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        expect(settings.textSize).toBe('text-lg');
      });
    });

    it('persists text size in localStorage', async () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));
      fireEvent.click(screen.getByTestId('text-large'));

      await waitFor(() => {
        const savedSettings = localStorage.getItem('settings');
        expect(savedSettings).toBeTruthy();
        const settings = JSON.parse(savedSettings!);
        expect(settings.textSize).toBe('text-lg');
      });
    });

    it('loads saved text size on initialization', async () => {
      localStorage.setItem('settings', JSON.stringify({ textSize: 'text-xl' }));

      renderApp();

      await waitFor(() => {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        expect(settings.textSize).toBe('text-xl');
      });
    });

    // ========================================================================
    // Language Setting Tests
    // ========================================================================

    it('displays language selector', () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));
      expect(screen.getByTestId('language-setting')).toBeInTheDocument();
      expect(screen.getByTestId('language-select')).toBeInTheDocument();
    });

    it('changes language to Spanish', async () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));

      const languageSelect = screen.getByTestId('language-select') as HTMLSelectElement;
      fireEvent.change(languageSelect, { target: { value: 'es' } });

      await waitFor(() => {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        expect(settings.language).toBe('es');
      });
    });

    it('changes language to French', async () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));

      const languageSelect = screen.getByTestId('language-select') as HTMLSelectElement;
      fireEvent.change(languageSelect, { target: { value: 'fr' } });

      await waitFor(() => {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        expect(settings.language).toBe('fr');
      });
    });

    it('persists language selection in localStorage', async () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));

      const languageSelect = screen.getByTestId('language-select') as HTMLSelectElement;
      fireEvent.change(languageSelect, { target: { value: 'es' } });

      await waitFor(() => {
        const savedSettings = localStorage.getItem('settings');
        expect(savedSettings).toBeTruthy();
        const settings = JSON.parse(savedSettings!);
        expect(settings.language).toBe('es');
      });
    });

    it('loads saved language on initialization', async () => {
      localStorage.setItem('settings', JSON.stringify({ language: 'fr' }));

      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));

      const languageSelect = screen.getByTestId('language-select') as HTMLSelectElement;
      expect(languageSelect.value).toBe('fr');
    });

    // ========================================================================
    // Show Content on Search Toggle Tests
    // ========================================================================

    it('displays show content on search toggle', () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));
      expect(screen.getByTestId('show-content-toggle')).toBeInTheDocument();
      expect(screen.getByTestId('show-content-checkbox')).toBeInTheDocument();
    });

    it('toggles show content on search setting', async () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));

      const checkbox = screen.getByTestId('show-content-checkbox') as HTMLInputElement;
      const initialState = checkbox.checked;

      fireEvent.click(checkbox);

      await waitFor(() => {
        expect(checkbox.checked).toBe(!initialState);
      });
    });

    it('persists show content on search toggle in localStorage', async () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));

      const checkbox = screen.getByTestId('show-content-checkbox') as HTMLInputElement;
      fireEvent.click(checkbox);

      await waitFor(() => {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        expect(settings.showContentOnSearch).toBeDefined();
      });
    });

    // ========================================================================
    // Settings Persistence Tests
    // ========================================================================

    it('persists multiple settings together', async () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));

      // Change multiple settings
      fireEvent.click(screen.getByTestId('theme-dark'));
      fireEvent.click(screen.getByTestId('text-large'));

      const languageSelect = screen.getByTestId('language-select') as HTMLSelectElement;
      fireEvent.change(languageSelect, { target: { value: 'es' } });

      await waitFor(() => {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        expect(settings.theme).toBe('dark');
        expect(settings.textSize).toBe('text-lg');
        expect(settings.language).toBe('es');
      });
    });

    it('loads all saved settings on initialization', async () => {
      const savedSettings = {
        theme: 'dark',
        textSize: 'text-xl',
        language: 'fr',
        showContentOnSearch: true,
      };
      localStorage.setItem('settings', JSON.stringify(savedSettings));

      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));

      await waitFor(() => {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        expect(settings.theme).toBe('dark');
        expect(settings.textSize).toBe('text-xl');
        expect(settings.language).toBe('fr');
        expect(settings.showContentOnSearch).toBe(true);
      });
    });

    it('merges new settings with existing settings', async () => {
      localStorage.setItem('settings', JSON.stringify({ theme: 'dark' }));

      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));
      fireEvent.click(screen.getByTestId('text-large'));

      await waitFor(() => {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        expect(settings.theme).toBe('dark'); // Existing setting preserved
        expect(settings.textSize).toBe('text-lg'); // New setting added
      });
    });

    // ========================================================================
    // Error Handling Tests
    // ========================================================================

    it('handles corrupted localStorage settings gracefully', async () => {
      localStorage.setItem('settings', 'invalid-json-{');

      // Should not throw error
      expect(() => renderApp()).not.toThrow();

      fireEvent.click(screen.getByTestId('settings-button'));
      expect(screen.getByTestId('settings-drawer')).toBeInTheDocument();
    });

    it('handles missing localStorage gracefully', async () => {
      // Clear localStorage
      localStorage.clear();

      renderApp();

      fireEvent.click(screen.getByTestId('settings-button'));
      expect(screen.getByTestId('settings-drawer')).toBeInTheDocument();
    });

    it('handles empty settings object', async () => {
      localStorage.setItem('settings', JSON.stringify({}));

      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));

      // Should display default settings
      expect(screen.getByTestId('theme-setting')).toBeInTheDocument();
      expect(screen.getByTestId('text-size-setting')).toBeInTheDocument();
    });

    it('handles null values in settings', async () => {
      localStorage.setItem('settings', JSON.stringify({ theme: null, textSize: null }));

      expect(() => renderApp()).not.toThrow();

      fireEvent.click(screen.getByTestId('settings-button'));
      expect(screen.getByTestId('settings-drawer')).toBeInTheDocument();
    });

    // ========================================================================
    // Settings Drawer UI Tests
    // ========================================================================

    it('closes settings drawer when clicking outside', async () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));

      await waitFor(() => {
        expect(screen.getByTestId('settings-drawer')).toHaveAttribute('data-open', 'true');
      });

      // Click the overlay/outside area
      const overlay = screen.getByLabelText('Close settings overlay');
      fireEvent.click(overlay);

      await waitFor(() => {
        expect(screen.getByTestId('settings-drawer')).toHaveAttribute('data-open', 'false');
      });
    });

    it('settings drawer displays all setting sections', () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));

      expect(screen.getByTestId('theme-setting')).toBeInTheDocument();
      expect(screen.getByTestId('text-size-setting')).toBeInTheDocument();
      expect(screen.getByTestId('font-setting')).toBeInTheDocument();
      expect(screen.getByTestId('language-setting')).toBeInTheDocument();
      expect(screen.getByTestId('show-content-toggle')).toBeInTheDocument();
    });

    // ========================================================================
    // Edge Cases
    // ========================================================================

    it('handles rapid setting changes', async () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));

      // Rapidly change theme multiple times
      fireEvent.click(screen.getByTestId('theme-dark'));
      fireEvent.click(screen.getByTestId('theme-light'));
      fireEvent.click(screen.getByTestId('theme-dark'));

      await waitFor(() => {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        expect(settings.theme).toBe('dark');
      });
    });

    it('handles simultaneous setting changes', async () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));

      // Change multiple settings simultaneously
      fireEvent.click(screen.getByTestId('theme-dark'));
      fireEvent.click(screen.getByTestId('text-small'));

      await waitFor(() => {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        expect(settings.theme).toBe('dark');
        expect(settings.textSize).toBe('text-sm');
      });
    });

    it('preserves other settings when changing one setting', async () => {
      localStorage.setItem(
        'settings',
        JSON.stringify({
          theme: 'dark',
          textSize: 'text-lg',
          language: 'es',
        })
      );

      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));

      // Only change theme
      fireEvent.click(screen.getByTestId('theme-light'));

      await waitFor(() => {
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        expect(settings.theme).toBe('light');
        expect(settings.textSize).toBe('text-lg'); // Preserved
        expect(settings.language).toBe('es'); // Preserved
      });
    });
  });

  // ==========================================================================
  // 12. ACCESSIBILITY
  // ==========================================================================

  describe('12. Accessibility', () => {
    it('search input has accessible label', () => {
      renderApp();
      expect(screen.getByRole('textbox', { name: 'Search everything...' })).toBeInTheDocument();
    });

    it('sort options have ARIA group', () => {
      renderApp();
      expect(screen.getByTestId('sort-options')).toHaveAttribute('role', 'group');
    });

    it('filter options have ARIA group', () => {
      renderApp();
      expect(screen.getByTestId('filter-options')).toHaveAttribute('role', 'group');
    });

    it('navigation header has banner role', () => {
      renderApp();
      expect(screen.getByTestId('navigation-header')).toHaveAttribute('role', 'banner');
    });

    it('settings button has accessible label', () => {
      renderApp();
      expect(screen.getByLabelText('Open settings')).toBeInTheDocument();
    });

    it('close settings button has accessible label', () => {
      renderApp();
      fireEvent.click(screen.getByTestId('settings-button'));
      expect(screen.getByLabelText('Close settings')).toBeInTheDocument();
    });

    it('sort buttons have aria-pressed', () => {
      renderApp();
      expect(screen.getByTestId('sort-likes')).toHaveAttribute('aria-pressed', 'false');
      fireEvent.click(screen.getByTestId('sort-likes'));
      expect(screen.getByTestId('sort-likes')).toHaveAttribute('aria-pressed', 'true');
    });

    it('range inputs have accessible labels', () => {
      renderApp();
      expect(screen.getByLabelText('Minimum likes')).toBeInTheDocument();
      expect(screen.getByLabelText('Maximum likes')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // 13. EDGE CASES & ERROR HANDLING
  // ==========================================================================

  describe('13. Edge Cases & Error Handling', () => {
    it('handles NaN in range inputs', async () => {
      renderApp();
      fireEvent.change(screen.getByTestId('min-likes'), { target: { value: 'abc' } });
      await waitFor(() => {
        expect(screen.getAllByTestId(/^comment-comment-/).length).toBe(12);
      });
    });

    it('handles negative numbers in range inputs', async () => {
      renderApp();
      fireEvent.change(screen.getByTestId('min-likes'), { target: { value: '-5' } });
      await waitFor(() => {
        expect(screen.getAllByTestId(/^comment-comment-/).length).toBe(12);
      });
    });

    it('handles very large numbers', async () => {
      renderApp();
      fireEvent.change(screen.getByTestId('min-likes'), { target: { value: '999999999' } });
      await waitFor(() => {
        expect(screen.getByTestId('no-comments')).toBeInTheDocument();
      });
    });

    it('preserves filters when switching tabs', async () => {
      renderApp();
      fireEvent.click(screen.getByTestId('filter-heart'));
      await waitFor(() =>
        expect(screen.getAllByTestId(/^comment-comment-/).length).toBeLessThan(10)
      );
      fireEvent.click(screen.getByText(/Transcript/));
      fireEvent.click(screen.getByText(/Comments/));
      await waitFor(() => {
        const comments = screen.getAllByTestId(/^comment-comment-/);
        comments.forEach((c) => expect(c).toHaveAttribute('data-hearted', 'true'));
      });
    });

    it('preserves search when switching tabs', async () => {
      renderApp();
      fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
        target: { value: 'React' },
      });
      fireEvent.click(screen.getByLabelText('Submit search'));
      await waitFor(() =>
        expect(screen.queryByTestId('comment-comment-5')).not.toBeInTheDocument()
      );
      fireEvent.click(screen.getByText(/Transcript/));
      fireEvent.click(screen.getByText(/Comments/));
      await waitFor(() =>
        expect(screen.queryByTestId('comment-comment-5')).not.toBeInTheDocument()
      );
    });

    it('handles empty comment list gracefully', async () => {
      renderApp();
      fireEvent.change(screen.getByTestId('min-likes'), { target: { value: '1000000' } });
      await waitFor(() => {
        expect(screen.getByTestId('no-comments')).toBeInTheDocument();
        expect(screen.getByTestId('comment-list')).toHaveAttribute('data-count', '0');
      });
    });
  });

  // ==========================================================================
  // 14. COMMENT DISPLAY
  // ==========================================================================

  describe('14. Comment Display', () => {
    it('displays comment author', () => {
      renderApp();
      expect(screen.getAllByTestId('comment-author')[0]).toBeInTheDocument();
    });

    it('displays comment content', () => {
      renderApp();
      expect(screen.getAllByTestId('comment-content')[0]).toBeInTheDocument();
    });

    it('displays comment likes', () => {
      renderApp();
      expect(screen.getAllByTestId('comment-likes')[0]).toBeInTheDocument();
    });

    it('displays comment replies count', () => {
      renderApp();
      expect(screen.getAllByTestId('comment-replies')[0]).toBeInTheDocument();
    });

    it('displays comment published date', () => {
      renderApp();
      expect(screen.getAllByTestId('comment-published')[0]).toBeInTheDocument();
    });

    it('comments have correct data attributes', () => {
      renderApp();
      const comment = screen.getByTestId('comment-comment-1');
      expect(comment).toHaveAttribute('data-likes', '150');
      expect(comment).toHaveAttribute('data-replies', '12');
      expect(comment).toHaveAttribute('data-author', 'John Doe');
    });
  });

  // ==========================================================================
  // 15. PERFORMANCE SCENARIOS
  // ==========================================================================

  describe('15. Performance Scenarios', () => {
    it('handles rapid search changes', async () => {
      renderApp();
      const input = screen.getByPlaceholderText('Search everything...');
      for (const char of 'React') {
        fireEvent.change(input, { target: { value: input.getAttribute('value') + char } });
      }
      fireEvent.click(screen.getByLabelText('Submit search'));
      await waitFor(() => {
        expect(screen.getByTestId('comment-comment-1')).toBeInTheDocument();
      });
    });

    it('handles rapid filter changes', async () => {
      renderApp();
      const filters = ['filter-heart', 'filter-members'];
      for (const f of filters) {
        fireEvent.click(screen.getByTestId(f));
      }
      await waitFor(() => {
        expect(screen.getAllByTestId(/^comment-comment-/).length).toBeGreaterThan(0);
      });
    });

    it('handles simultaneous operations', async () => {
      renderApp();
      fireEvent.change(screen.getByPlaceholderText('Search everything...'), {
        target: { value: 'the' },
      });
      fireEvent.click(screen.getByLabelText('Submit search'));
      fireEvent.click(screen.getByTestId('filter-heart'));
      fireEvent.click(screen.getByTestId('sort-likes'));
      fireEvent.change(screen.getByTestId('min-likes'), { target: { value: '10' } });
      await waitFor(() => {
        expect(screen.getAllByTestId(/^comment-comment-/).length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('16. Action Buttons', () => {
    it('copies comment content to clipboard', async () => {
      renderApp();
      const copyBtn = screen.getByTestId('btn-copy-comment-1');
      fireEvent.click(copyBtn);
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('This is a great tutorial')
        );
      });
    });

    it('shares comment link (copies to clipboard)', async () => {
      renderApp();
      const shareBtn = screen.getByTestId('btn-share-comment-1');
      fireEvent.click(shareBtn);
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('lc=comment-1')
        );
      });
    });

    it('opens original comment in new tab', async () => {
      // Mock window.open
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      renderApp();
      const originalBtn = screen.getByTestId('btn-original-comment-1');
      fireEvent.click(originalBtn);
      await waitFor(() => {
        expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('lc=comment-1'), '_blank');
      });
      openSpy.mockRestore();
    });
  });
});
