import { Comment } from '../../../types/commentTypes';
import { loadPagedComments, countComments, fetchRepliesForComment } from './pagination';
import { PAGINATION } from '../../shared/utils/appConstants.ts';
import Dexie from 'dexie';

// Mock the logger module
jest.mock('../../shared/utils/logger', () => ({
    start: jest.fn(),
    end: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
}));

// Mock Dexie's Table and Collection methods
const mockToArray = jest.fn();
const mockLimit = jest.fn().mockReturnThis();
const mockOffset = jest.fn().mockReturnThis();
const mockReverse = jest.fn().mockReturnThis();
const mockFilter = jest.fn().mockReturnThis();
const mockBetween = jest.fn().mockReturnThis();
const mockEquals = jest.fn().mockReturnThis();
const mockAnd = jest.fn().mockReturnThis();
const mockFirst = jest.fn();
const mockCount = jest.fn();

const mockCollection = {
    toArray: mockToArray,
    limit: mockLimit,
    offset: mockOffset,
    reverse: mockReverse,
    filter: mockFilter,
    count: mockCount,
    and: mockAnd,
};

const mockCommentsTable = {
    where: jest.fn().mockReturnValue({
        between: mockBetween,
        equals: mockEquals,
        first: mockFirst,
        ...mockCollection,
    }),
};

const resetMocks = () => {
    mockToArray.mockClear();
    mockLimit.mockClear().mockReturnThis();
    mockOffset.mockClear().mockReturnThis();
    mockReverse.mockClear().mockReturnThis();
    mockFilter.mockClear().mockReturnThis();
    mockBetween.mockClear().mockReturnThis();
    mockEquals.mockClear().mockReturnThis();
    mockAnd.mockClear().mockReturnThis();
    mockFirst.mockClear();
    mockCount.mockClear();

    mockLimit.mockImplementation(() => mockCollection);
    mockOffset.mockImplementation(() => mockCollection);
    mockReverse.mockImplementation(() => mockCollection);
    mockFilter.mockImplementation(() => mockCollection);
    mockBetween.mockImplementation(() => mockCollection);
    mockEquals.mockImplementation(() => mockCollection);
    mockAnd.mockImplementation(() => mockCollection);

    mockCommentsTable.where.mockClear().mockReturnValue({
      between: mockBetween,
      equals: mockEquals,
      first: mockFirst,
      ...mockCollection,
    });

    (require('../../shared/utils/logger') as jest.Mocked<any>).start.mockClear();
    (require('../../shared/utils/logger') as jest.Mocked<any>).end.mockClear();
    (require('../../shared/utils/logger') as jest.Mocked<any>).info.mockClear();
    (require('../../shared/utils/logger') as jest.Mocked<any>).warn.mockClear();
    (require('../../shared/utils/logger') as jest.Mocked<any>).error.mockClear();
    (require('../../shared/utils/logger') as jest.Mocked<any>).success.mockClear();
};

// Sample comments for testing (Corrected wordCount type)
const sampleComment1: Comment = { commentId: 'c1', videoId: 'v1', content: 'Test comment one', publishedDate: '2023-01-01T10:00:00Z', likes: 10, replyCount: 2, author: 'User A', replyLevel: 0, hasTimestamp: false, isHearted: false, hasLinks: false, isMember: false, isDonated: false, isAuthorContentCreator: false, wordCount: 3 };
const sampleComment2: Comment = { commentId: 'c2', videoId: 'v1', content: 'Test comment two with link http://example.com', publishedDate: '2023-01-02T11:00:00Z', likes: 5, replyCount: 0, author: 'User B', replyLevel: 0, hasTimestamp: true, isHearted: true, hasLinks: true, isMember: true, isDonated: true, isAuthorContentCreator: true, wordCount: 6 };
const sampleComment3: Comment = { commentId: 'c3', videoId: 'v1', content: 'Another test comment', publishedDate: '2023-01-03T12:00:00Z', likes: 20, replyCount: 1, author: 'User A', replyLevel: 0, hasTimestamp: false, isHearted: false, hasLinks: false, isMember: false, isDonated: false, isAuthorContentCreator: false, wordCount: 3 };
const sampleReply1: Comment = { commentId: 'r1', videoId: 'v1', content: 'Reply to c1', publishedDate: '2023-01-01T10:05:00Z', likes: 1, replyCount: 0, author: 'User C', replyLevel: 1, commentParentId: 'c1' };
const sampleReply2: Comment = { commentId: 'r2', videoId: 'v1', content: 'Second reply to c1', publishedDate: '2023-01-01T10:10:00Z', likes: 3, replyCount: 0, author: 'User D', replyLevel: 1, commentParentId: 'c1' };

// Cast the mock table to the Dexie Table type to satisfy TypeScript
const mockTable = mockCommentsTable as unknown as Dexie.Table<Comment, number>;

describe('Pagination Services', () => {
    beforeEach(() => {
        resetMocks();
        // Use fake timers to control promise resolution in filter mocks
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers(); // Restore real timers after each test
    });

    // --- Tests for loadPagedComments ---
    describe('loadPagedComments', () => {
        it('should load the first page with default sorting (date desc)', async () => {
            const expectedComments = [sampleComment3, sampleComment2, sampleComment1];
            mockToArray.mockResolvedValue(expectedComments);

            const result = await loadPagedComments(mockTable, 'v1');

            expect(mockCommentsTable.where).toHaveBeenCalledWith('[videoId+replyLevel+publishedDate]');
            expect(mockBetween).toHaveBeenCalledWith(['v1', 0, Dexie.minKey], ['v1', 0, Dexie.maxKey], true, true);
            expect(mockReverse).toHaveBeenCalled();
            expect(mockOffset).toHaveBeenCalledWith(0);
            expect(mockLimit).toHaveBeenCalledWith(PAGINATION.DEFAULT_PAGE_SIZE);
            expect(mockToArray).toHaveBeenCalled();
            expect(result).toEqual(expectedComments);
        });

        it('should load a specific page with specific page size', async () => {
            const page = 2;
            const pageSize = 5;
            mockToArray.mockResolvedValue([sampleComment1]);

            await loadPagedComments(mockTable, 'v1', page, pageSize);

            expect(mockOffset).toHaveBeenCalledWith(page * pageSize);
            expect(mockLimit).toHaveBeenCalledWith(pageSize);
            expect(mockToArray).toHaveBeenCalled();
        });

         it('should apply sorting (likes asc)', async () => {
            const expectedComments = [sampleComment2, sampleComment1, sampleComment3];
            mockToArray.mockResolvedValue(expectedComments);

            const result = await loadPagedComments(mockTable, 'v1', 0, 10, 'likes', 'asc');

            expect(mockCommentsTable.where).toHaveBeenCalledWith('[videoId+replyLevel+likes]');
            expect(mockBetween).toHaveBeenCalledWith(['v1', 0, Dexie.minKey], ['v1', 0, Dexie.maxKey], true, true);
            expect(mockReverse).not.toHaveBeenCalled();
            expect(result).toEqual(expectedComments);
        });

        it('should apply filters (hearted and links)', async () => {
            const filters = { heart: true, links: true };
            const mockFilteredData = [sampleComment2];
            mockFilter.mockImplementation((filterFn) => {
                 // Simulate Dexie's filter returning filtered data to toArray
                 mockToArray.mockResolvedValue([sampleComment1, sampleComment2, sampleComment3].filter(filterFn));
                return mockCollection;
            });

            const resultPromise = loadPagedComments(mockTable, 'v1', 0, 10, 'date', 'desc', filters);
            await jest.runAllTimersAsync(); // Resolve promises from filter implementation
            const result = await resultPromise;

            expect(mockFilter).toHaveBeenCalled();
            expect(result).toEqual(mockFilteredData);
        });

         it('should apply search keyword', async () => {
            const searchKeyword = 'link';
            const mockFilteredData = [sampleComment2];
            mockFilter.mockImplementation((filterFn) => {
                 mockToArray.mockResolvedValue([sampleComment1, sampleComment2, sampleComment3].filter(filterFn));
                return mockCollection;
            });

            const resultPromise = loadPagedComments(mockTable, 'v1', 0, 10, 'date', 'desc', {}, searchKeyword);
            await jest.runAllTimersAsync();
            const result = await resultPromise;

            expect(mockFilter).toHaveBeenCalled();
            expect(result).toEqual(mockFilteredData);
        });

        it('should handle "random" sort', async () => {
             const allComments = [sampleComment1, sampleComment2, sampleComment3];
             mockToArray.mockResolvedValueOnce(allComments); // Mock the initial fetch for random

             const result = await loadPagedComments(mockTable, 'v1', 0, 2, 'random', 'desc');

             expect(mockCommentsTable.where).toHaveBeenCalledWith('[videoId+replyLevel+publishedDate]');
             expect(mockBetween).toHaveBeenCalled();
             expect(mockToArray).toHaveBeenCalledTimes(1); // Only the initial fetch

             expect(result.length).toBe(2);
             expect(allComments).toEqual(expect.arrayContaining(result));
        });

        it('should return empty array on validation error (invalid page)', async () => {
            const result = await loadPagedComments(mockTable, 'v1', -1);
            expect(result).toEqual([]);
            expect(mockCommentsTable.where).not.toHaveBeenCalled();
            expect(require('../../shared/utils/logger').error).toHaveBeenCalledWith(expect.stringContaining('Invalid page number'));
        });

         it('should return empty array on database error', async () => {
            const error = new Error('Dexie Error');
            mockToArray.mockRejectedValue(error);

            const result = await loadPagedComments(mockTable, 'v1');

            expect(result).toEqual([]);
            expect(require('../../shared/utils/logger').error).toHaveBeenCalledWith(expect.stringContaining('Error loading paged comments'), error);
        });

        it('should apply sorting by author ascending', async () => {
            // Note: Author sort is applied *after* fetching from Dexie
            const fetchedComments = [sampleComment1, sampleComment2, sampleComment3]; // Assume Dexie returns these in some order
            const expectedSorted = [sampleComment1, sampleComment3, sampleComment2]; // Sorted by author: User A, User A, User B
            mockToArray.mockResolvedValue(fetchedComments);

            const result = await loadPagedComments(mockTable, 'v1', 0, 10, 'author', 'asc');

            expect(mockCommentsTable.where).toHaveBeenCalledWith('[videoId+replyLevel+author]');
            expect(mockToArray).toHaveBeenCalled();
            // Check that the final result is sorted correctly by the JS sort
            expect(result).toEqual(expectedSorted);
        });

        it('should apply multiple filters (timestamp and member)', async () => {
            const filters = { timestamps: true, members: true };
            const mockFilteredData = [sampleComment2]; // Only comment 2 has both
            mockFilter.mockImplementation((filterFn) => {
                 mockToArray.mockResolvedValue([sampleComment1, sampleComment2, sampleComment3].filter(filterFn));
                return mockCollection;
            });

            const resultPromise = loadPagedComments(mockTable, 'v1', 0, 10, 'date', 'desc', filters);
            await jest.runAllTimersAsync();
            const result = await resultPromise;

            expect(mockFilter).toHaveBeenCalled();
            expect(result).toEqual(mockFilteredData);
        });

        it('should perform case-insensitive search', async () => {
            const searchKeyword = 'LINK'; // Uppercase
            const mockFilteredData = [sampleComment2]; // Should match 'link' in comment 2
            mockFilter.mockImplementation((filterFn) => {
                 mockToArray.mockResolvedValue([sampleComment1, sampleComment2, sampleComment3].filter(filterFn));
                return mockCollection;
            });

            const resultPromise = loadPagedComments(mockTable, 'v1', 0, 10, 'date', 'desc', {}, searchKeyword);
            await jest.runAllTimersAsync();
            const result = await resultPromise;

            expect(mockFilter).toHaveBeenCalled();
            expect(result).toEqual(mockFilteredData);
        });

        it('should return empty array when no comments match filters/search', async () => {
            const filters = { donated: true }; // None in sample data
            const searchKeyword = 'nonexistentword';
            mockFilter.mockImplementation((filterFn) => {
                 mockToArray.mockResolvedValue([sampleComment1, sampleComment2, sampleComment3].filter(filterFn)); // This will be empty
                return mockCollection;
            });

            const resultPromise = loadPagedComments(mockTable, 'v1', 0, 10, 'date', 'desc', filters, searchKeyword);
            await jest.runAllTimersAsync();
            const result = await resultPromise;

            expect(mockFilter).toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        it('should return empty array for a page beyond the total number of comments', async () => {
            const page = 5; // Assume only 1 page of results
            const pageSize = 10;
            // Mock offset().limit().toArray() returning empty
            mockOffset.mockImplementation(() => {
                mockLimit.mockImplementation(() => {
                    mockToArray.mockResolvedValue([]);
                    return mockCollection;
                });
                return mockCollection;
            });


            const result = await loadPagedComments(mockTable, 'v1', page, pageSize);

            expect(mockOffset).toHaveBeenCalledWith(page * pageSize);
            expect(mockLimit).toHaveBeenCalledWith(pageSize);
            expect(mockToArray).toHaveBeenCalled();
            expect(result).toEqual([]);
        });
    });

    // --- Tests for countComments ---
    describe('countComments', () => {
        it('should count all comments for a videoId', async () => {
            const expectedCount = 5;
            mockCount.mockResolvedValue(expectedCount);

            const result = await countComments(mockTable, 'v1');

            expect(mockCommentsTable.where).toHaveBeenCalledWith('videoId');
            expect(mockEquals).toHaveBeenCalledWith('v1');
            expect(mockFilter).not.toHaveBeenCalled();
            expect(mockCount).toHaveBeenCalled();
            expect(result).toBe(expectedCount);
        });

        it('should count only top-level comments when specified', async () => {
            const expectedCount = 3;
            mockCount.mockResolvedValue(expectedCount);

            const result = await countComments(mockTable, 'v1', {}, '', { topLevelOnly: true });

            expect(mockCommentsTable.where).toHaveBeenCalledWith('[videoId+replyLevel]');
            expect(mockBetween).toHaveBeenCalledWith(['v1', 0], ['v1', 0], true, true);
            expect(mockFilter).not.toHaveBeenCalled();
            expect(mockCount).toHaveBeenCalled();
            expect(result).toBe(expectedCount);
        });

        it('should apply filters and search when counting', async () => {
            const filters = { timestamps: true };
            const searchKeyword = 'test';
            const expectedCount = 1; // Only sampleComment2 has timestamp AND matches 'test' in content
            mockFilter.mockImplementation((filterFn) => {
                 const filtered = [sampleComment1, sampleComment2, sampleComment3].filter(filterFn);
                 mockCount.mockResolvedValue(filtered.length);
                 return mockCollection;
             });

             const resultPromise = countComments(mockTable, 'v1', filters, searchKeyword);
             await jest.runAllTimersAsync();
             const result = await resultPromise;

            expect(mockCommentsTable.where).toHaveBeenCalledWith('videoId');
            expect(mockEquals).toHaveBeenCalledWith('v1');
            expect(mockFilter).toHaveBeenCalled();
            expect(mockCount).toHaveBeenCalled();
            expect(result).toBe(expectedCount);
        });

         it('should apply filters, search, and topLevelOnly when counting', async () => {
            const filters = { members: true };
            const searchKeyword = 'two';
            const expectedCount = 1; // Only sampleComment2 matches
            mockFilter.mockImplementation((filterFn) => {
                 const filtered = [sampleComment1, sampleComment2, sampleComment3].filter(filterFn);
                 mockCount.mockResolvedValue(filtered.length);
                 return mockCollection;
             });

            const resultPromise = countComments(mockTable, 'v1', filters, searchKeyword, { topLevelOnly: true });
            await jest.runAllTimersAsync();
            const result = await resultPromise;

            expect(mockCommentsTable.where).toHaveBeenCalledWith('[videoId+replyLevel]');
            expect(mockBetween).toHaveBeenCalledWith(['v1', 0], ['v1', 0], true, true);
            expect(mockFilter).toHaveBeenCalled();
            expect(mockCount).toHaveBeenCalled();
            expect(result).toBe(expectedCount);
        });

        it('should return 0 on database error', async () => {
            const error = new Error('Dexie Count Error');
            mockCount.mockRejectedValue(error);

            const result = await countComments(mockTable, 'v1');

            expect(result).toBe(0);
            expect(require('../../shared/utils/logger').error).toHaveBeenCalledWith(expect.stringContaining('Error counting comments'), error);
        });

        it('should count comments matching multiple filters', async () => {
            const filters = { hasLinks: true, isHearted: true }; // Only sampleComment2 matches both
            const expectedCount = 1;
            mockFilter.mockImplementation((filterFn) => {
                 const filtered = [sampleComment1, sampleComment2, sampleComment3].filter(filterFn);
                 mockCount.mockResolvedValue(filtered.length);
                 return mockCollection;
             });

             const resultPromise = countComments(mockTable, 'v1', filters);
             await jest.runAllTimersAsync();
             const result = await resultPromise;

            expect(mockFilter).toHaveBeenCalled();
            expect(mockCount).toHaveBeenCalled();
            expect(result).toBe(expectedCount);
        });

        it('should return 0 when counting and no comments match criteria', async () => {
            const filters = { isDonated: true }; // None match
            const searchKeyword = 'qwertyuiop';
            const expectedCount = 0;
            mockFilter.mockImplementation((filterFn) => {
                 const filtered = [sampleComment1, sampleComment2, sampleComment3].filter(filterFn);
                 mockCount.mockResolvedValue(filtered.length); // Will be 0
                 return mockCollection;
             });

             const resultPromise = countComments(mockTable, 'v1', filters, searchKeyword);
             await jest.runAllTimersAsync();
             const result = await resultPromise;

            expect(mockFilter).toHaveBeenCalled();
            expect(mockCount).toHaveBeenCalled();
            expect(result).toBe(expectedCount);
        });
    });

    // --- Tests for fetchRepliesForComment ---
    describe('fetchRepliesForComment', () => {
         it('should fetch replies for a given parent comment', async () => {
            const parentId = 'c1';
            const expectedReplies = [sampleReply1];
            mockAnd.mockImplementation((filterFn) => {
                 mockToArray.mockResolvedValue([sampleReply1].filter(filterFn));
                 return mockCollection;
             });

             const resultPromise = fetchRepliesForComment(mockTable, 'v1', parentId);
             await jest.runAllTimersAsync();
             const result = await resultPromise;

            expect(mockCommentsTable.where).toHaveBeenCalledWith('videoId');
            expect(mockEquals).toHaveBeenCalledWith('v1');
            expect(mockAnd).toHaveBeenCalled();
            expect(mockToArray).toHaveBeenCalled();
            expect(result).toEqual(expectedReplies);
        });

         it('should return an empty array if no replies are found', async () => {
            const parentId = 'c2';
            mockAnd.mockImplementation((filterFn) => {
                mockToArray.mockResolvedValue([]);
                return mockCollection;
            });
            mockFirst.mockResolvedValue({ ...sampleComment2, replyCount: 0 });

            const resultPromise = fetchRepliesForComment(mockTable, 'v1', parentId);
            await jest.runAllTimersAsync();
            const result = await resultPromise;

            expect(result).toEqual([]);
            expect(mockFirst).toHaveBeenCalled();
            expect(require('../../shared/utils/logger').info).toHaveBeenCalledWith(expect.stringContaining('No replies found, and parent comment does not indicate any replies'));
        });

         it('should return an empty array and log warning if parent expects replies but none found', async () => {
            const parentId = 'c3';
            mockAnd.mockImplementation((filterFn) => {
                 mockToArray.mockResolvedValue([]);
                 return mockCollection;
             });
            mockFirst.mockResolvedValue({ ...sampleComment3, replyCount: 1 });

            const resultPromise = fetchRepliesForComment(mockTable, 'v1', parentId);
            await jest.runAllTimersAsync();
            const result = await resultPromise;

            expect(result).toEqual([]);
            expect(mockFirst).toHaveBeenCalled();
            expect(require('../../shared/utils/logger').warn).toHaveBeenCalledWith(expect.stringContaining('No replies found in DB, but parent comment (replyCount: 1) indicates replies should exist.'));
        });


        it('should return empty array on database error', async () => {
            const parentId = 'c1';
            const error = new Error('Dexie Fetch Error');
            mockAnd.mockImplementation(() => {
                 mockToArray.mockRejectedValue(error);
                 return mockCollection;
             });

            const result = await fetchRepliesForComment(mockTable, 'v1', parentId);

            expect(result).toEqual([]);
            expect(require('../../shared/utils/logger').error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch replies'), error);
        });

         it('should return empty array on validation error (missing parentId)', async () => {
            const result = await fetchRepliesForComment(mockTable, 'v1', '');
            expect(result).toEqual([]);
            expect(mockCommentsTable.where).not.toHaveBeenCalled();
            expect(require('../../shared/utils/logger').error).toHaveBeenCalledWith(expect.stringContaining('parentId is required'));
        });

        it('should fetch multiple replies for a comment', async () => {
            const parentId = 'c1';
            const expectedReplies = [sampleReply1, sampleReply2]; // Assuming both are replies to c1
            mockAnd.mockImplementation((filterFn) => {
                 // Simulate the .and() filter returning multiple replies
                 mockToArray.mockResolvedValue([sampleReply1, sampleReply2].filter(filterFn));
                 return mockCollection;
             });

             const resultPromise = fetchRepliesForComment(mockTable, 'v1', parentId);
             await jest.runAllTimersAsync();
             const result = await resultPromise;

            expect(mockAnd).toHaveBeenCalled();
            expect(mockToArray).toHaveBeenCalled();
            // Order might not be guaranteed by mock, sort for comparison if needed
            // expect(result.sort((a,b) => a.publishedDate.localeCompare(b.publishedDate))).toEqual(expectedReplies.sort((a,b) => a.publishedDate.localeCompare(b.publishedDate)));
             expect(result).toEqual(expect.arrayContaining(expectedReplies));
             expect(result.length).toBe(expectedReplies.length);
        });

        it('should return empty array and log info if parent comment does not exist', async () => {
            const parentId = 'nonExistentParent';
            // Query for replies will return empty
            mockAnd.mockImplementation((filterFn) => {
                 mockToArray.mockResolvedValue([]);
                 return mockCollection;
             });
            // Query for parent returns undefined
            mockFirst.mockResolvedValue(undefined);

            const resultPromise = fetchRepliesForComment(mockTable, 'v1', parentId);
            await jest.runAllTimersAsync();
            const result = await resultPromise;

            expect(result).toEqual([]);
            expect(mockFirst).toHaveBeenCalled(); // Attempted to find parent
            expect(require('../../shared/utils/logger').info).toHaveBeenCalledWith(expect.stringContaining('No replies found, and parent comment does not indicate any replies (or parent not found)'));
        });
    });
}); 