// src/features/comments/hooks/useCommentsFromDB.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCommentsFromDB, useLiveCommentCount, useNewCommentsAvailable } from './useCommentsFromDB';
import { FilterState } from '../../../types/filterTypes';
import { Comment } from '../../../types/commentTypes';

// Mock dexie-react-hooks
vi.mock('dexie-react-hooks', () => ({
    useLiveQuery: vi.fn((queryFn, deps, defaultValue) => {
        // Return a mock value that simulates the async query
        return defaultValue;
    }),
}));

// Mock the database
vi.mock('../../shared/utils/database/database', () => ({
    db: {
        comments: {
            where: vi.fn().mockReturnThis(),
            equals: vi.fn().mockReturnThis(),
            count: vi.fn().mockResolvedValue(0),
        },
    },
}));

// Mock the pagination service
const mockLoadPagedComments = vi.fn();
const mockCountComments = vi.fn();

vi.mock('../services/pagination', () => ({
    loadPagedComments: (...args: any[]) => mockLoadPagedComments(...args),
    countComments: (...args: any[]) => mockCountComments(...args),
}));

// Mock logger
vi.mock('../../shared/utils/logger', () => ({
    default: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        success: vi.fn(),
    },
}));

// Sample data
const mockFilters: FilterState = {
    keyword: '',
    verified: false,
    hasLinks: false,
    sortBy: 'date',
    sortOrder: 'desc',
    likesThreshold: { min: 0, max: Infinity },
    repliesLimit: { min: 0, max: Infinity },
    wordCount: { min: 0, max: Infinity },
    dateTimeRange: { start: '', end: '' },
};

const mockComments: Comment[] = [
    {
        commentId: 'c1',
        videoId: 'v1',
        content: 'Test comment 1',
        author: 'User A',
        authorAvatarUrl: '',
        authorChannelId: '',
        isAuthorContentCreator: false,
        likes: 10,
        viewLikes: '10',
        replyCount: 2,
        published: '1 day ago',
        publishedDate: Date.now() - 86400000,
        replyLevel: 0,
        hasTimestamp: false,
        hasLinks: false,
    },
    {
        commentId: 'c2',
        videoId: 'v1',
        content: 'Test comment 2',
        author: 'User B',
        authorAvatarUrl: '',
        authorChannelId: '',
        isAuthorContentCreator: false,
        likes: 5,
        viewLikes: '5',
        replyCount: 0,
        published: '2 days ago',
        publishedDate: Date.now() - 172800000,
        replyLevel: 0,
        hasTimestamp: true,
        hasLinks: false,
    },
];

describe('useCommentsFromDB', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLoadPagedComments.mockResolvedValue([]);
        mockCountComments.mockResolvedValue(0);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return initial loading state', () => {
        const { result } = renderHook(() =>
            useCommentsFromDB({
                videoId: 'v1',
                filters: mockFilters,
                searchKeyword: '',
            })
        );

        expect(result.current.isLoading).toBe(true);
        expect(result.current.comments).toEqual([]);
        expect(result.current.totalCount).toBe(0);
        expect(result.current.page).toBe(0);
    });

    it('should load comments on mount', async () => {
        mockLoadPagedComments.mockResolvedValue(mockComments);

        const { result } = renderHook(() =>
            useCommentsFromDB({
                videoId: 'v1',
                filters: mockFilters,
                searchKeyword: '',
            })
        );

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(mockLoadPagedComments).toHaveBeenCalled();
        expect(result.current.comments).toEqual(mockComments);
    });

    it('should return empty comments when videoId is null', () => {
        const { result } = renderHook(() =>
            useCommentsFromDB({
                videoId: null,
                filters: mockFilters,
                searchKeyword: '',
            })
        );

        expect(result.current.comments).toEqual([]);
        expect(result.current.isLoading).toBe(false);
        expect(mockLoadPagedComments).not.toHaveBeenCalled();
    });

    it('should reload comments when filters change', async () => {
        mockLoadPagedComments.mockResolvedValue(mockComments);

        const { result, rerender } = renderHook(
            ({ filters }) =>
                useCommentsFromDB({
                    videoId: 'v1',
                    filters,
                    searchKeyword: '',
                }),
            { initialProps: { filters: mockFilters } }
        );

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        const initialCallCount = mockLoadPagedComments.mock.calls.length;

        // Change filters
        rerender({
            filters: { ...mockFilters, sortBy: 'likes' },
        });

        await waitFor(() => {
            expect(mockLoadPagedComments.mock.calls.length).toBeGreaterThan(initialCallCount);
        });
    });

    it('should reload comments when searchKeyword changes', async () => {
        mockLoadPagedComments.mockResolvedValue(mockComments);

        const { result, rerender } = renderHook(
            ({ searchKeyword }) =>
                useCommentsFromDB({
                    videoId: 'v1',
                    filters: mockFilters,
                    searchKeyword,
                }),
            { initialProps: { searchKeyword: '' } }
        );

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        const initialCallCount = mockLoadPagedComments.mock.calls.length;

        // Change search keyword
        rerender({ searchKeyword: 'test' });

        await waitFor(() => {
            expect(mockLoadPagedComments.mock.calls.length).toBeGreaterThan(initialCallCount);
        });
    });

    it('should handle loadMore correctly', async () => {
        const page1Comments = [mockComments[0]];
        const page2Comments = [mockComments[1]];

        mockLoadPagedComments
            .mockResolvedValueOnce(page1Comments)
            .mockResolvedValueOnce(page2Comments);

        // Mock useLiveQuery to return a count that allows more loading
        const { useLiveQuery } = await import('dexie-react-hooks');
        (useLiveQuery as any).mockImplementation(() => 10);

        const { result } = renderHook(() =>
            useCommentsFromDB({
                videoId: 'v1',
                filters: mockFilters,
                searchKeyword: '',
            })
        );

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.comments).toEqual(page1Comments);
        expect(result.current.page).toBe(0);

        // Load more
        await act(async () => {
            await result.current.loadMore();
        });

        expect(result.current.comments).toEqual([...page1Comments, ...page2Comments]);
        expect(result.current.page).toBe(1);
    });

    it('should handle refresh correctly', async () => {
        const originalComments = [mockComments[0]];
        const refreshedComments = mockComments;

        mockLoadPagedComments
            .mockResolvedValueOnce(originalComments)
            .mockResolvedValueOnce(refreshedComments);

        const { result } = renderHook(() =>
            useCommentsFromDB({
                videoId: 'v1',
                filters: mockFilters,
                searchKeyword: '',
            })
        );

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.comments).toEqual(originalComments);

        // Refresh
        await act(async () => {
            await result.current.refresh();
        });

        expect(result.current.comments).toEqual(refreshedComments);
        expect(result.current.page).toBe(0);
    });

    it('should reset page when videoId changes', async () => {
        mockLoadPagedComments.mockResolvedValue(mockComments);

        const { result, rerender } = renderHook(
            ({ videoId }) =>
                useCommentsFromDB({
                    videoId,
                    filters: mockFilters,
                    searchKeyword: '',
                }),
            { initialProps: { videoId: 'v1' } }
        );

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false);
        });

        // Change video ID
        rerender({ videoId: 'v2' });

        expect(result.current.page).toBe(0);
    });
});

// Note: useLiveCommentCount and useNewCommentsAvailable rely heavily on useLiveQuery
// which requires complex mocking. The core logic is tested through the pagination.test.ts
// and the main useCommentsFromDB hook tests above cover the integration.
