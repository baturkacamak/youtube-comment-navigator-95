import { Comment } from '../../../types/commentTypes';
import { loadPagedComments, countComments, fetchRepliesForComment } from './pagination';
import { PAGINATION } from '../../shared/utils/appConstants';
import Dexie from 'dexie';
import logger from '../../shared/utils/logger';

// Mock the logger module
vi.mock('../../shared/utils/logger', () => ({
  default: {
    start: vi.fn(),
    end: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn(),
  },
}));

// --- Mock Dexie Setup --- START ---
const mockToArray = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();
const mockReverse = vi.fn();
const mockFilter = vi.fn();
const mockBetween = vi.fn();
const mockEquals = vi.fn();
const mockAnd = vi.fn();
const mockFirst = vi.fn();
const mockCount = vi.fn();

// Base collection methods object
const collectionMethods = {
  toArray: mockToArray,
  limit: mockLimit,
  offset: mockOffset,
  reverse: mockReverse,
  filter: mockFilter,
  count: mockCount,
  and: mockAnd,
};

// Query methods object
const queryMethods = {
  ...collectionMethods,
  between: mockBetween,
  equals: mockEquals,
  first: mockFirst,
};

const mockCommentsTable = {
  where: vi.fn(),
};

const resetMocks = () => {
  // Clear call history for all mocks
  const allMocks = [
    mockToArray,
    mockLimit,
    mockOffset,
    mockReverse,
    mockFilter,
    mockBetween,
    mockEquals,
    mockAnd,
    mockFirst,
    mockCount,
    mockCommentsTable.where,
  ];
  allMocks.forEach((m) => m.mockClear());

  // Reset implementations
  mockLimit.mockImplementation(() => collectionMethods);
  mockOffset.mockImplementation(() => collectionMethods);
  mockReverse.mockImplementation(() => collectionMethods);
  mockFilter.mockImplementation(() => collectionMethods);
  mockAnd.mockImplementation(() => queryMethods);
  mockEquals.mockImplementation(() => queryMethods);
  mockBetween.mockImplementation(() => queryMethods);
  mockCommentsTable.where.mockImplementation(() => queryMethods);

  // Reset logger mocks
  Object.values(logger).forEach((mockFn: any) => mockFn.mockClear());
};
// --- Mock Dexie Setup --- END ---

// Sample comments (MANUALLY ENSURE wordCount is number type)
const sampleComment1 = {
  commentId: 'c1',
  videoId: 'v1',
  content: 'Test comment one',
  publishedDate: '2023-01-01T10:00:00Z',
  likes: 10,
  replyCount: 2,
  author: 'User A',
  replyLevel: 0,
  hasTimestamp: false,
  isHearted: false,
  hasLinks: false,
  isMember: false,
  isDonated: false,
  isAuthorContentCreator: false,
  wordCount: 3,
};
const sampleComment2 = {
  commentId: 'c2',
  videoId: 'v1',
  content: 'Test comment two with link http://example.com',
  publishedDate: '2023-01-02T11:00:00Z',
  likes: 5,
  replyCount: 0,
  author: 'User B',
  replyLevel: 0,
  hasTimestamp: true,
  isHearted: true,
  hasLinks: true,
  isMember: true,
  isDonated: true,
  isAuthorContentCreator: true,
  wordCount: 6,
};
const sampleComment3 = {
  commentId: 'c3',
  videoId: 'v1',
  content: 'Another test comment',
  publishedDate: '2023-01-03T12:00:00Z',
  likes: 20,
  replyCount: 1,
  author: 'User A',
  replyLevel: 0,
  hasTimestamp: false,
  isHearted: false,
  hasLinks: false,
  isMember: false,
  isDonated: false,
  isAuthorContentCreator: false,
  wordCount: 3,
};
const sampleReply1 = {
  commentId: 'r1',
  videoId: 'v1',
  content: 'Reply to c1',
  publishedDate: '2023-01-01T10:05:00Z',
  likes: 1,
  replyCount: 0,
  author: 'User C',
  replyLevel: 1,
  commentParentId: 'c1',
  wordCount: 3,
};
const sampleReply2 = {
  commentId: 'r2',
  videoId: 'v1',
  content: 'Second reply to c1',
  publishedDate: '2023-01-01T10:10:00Z',
  likes: 3,
  replyCount: 0,
  author: 'User D',
  replyLevel: 1,
  commentParentId: 'c1',
  wordCount: 4,
};

const mockTable = mockCommentsTable as unknown as Dexie.Table<Comment, number>;

describe('Pagination Services', () => {
  beforeEach(() => {
    resetMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('loadPagedComments', () => {
    it('should load the first page with default sorting (date desc)', async () => {
      const expectedComments = [sampleComment3, sampleComment2, sampleComment1];
      mockToArray.mockResolvedValue(expectedComments);
      await loadPagedComments(mockTable, 'v1');
      expect(mockCommentsTable.where).toHaveBeenCalledWith('[videoId+replyLevel+publishedDate]');
      expect(mockBetween).toHaveBeenCalledWith(
        ['v1', 0, Dexie.minKey],
        ['v1', 0, Dexie.maxKey],
        true,
        true
      );
      expect(mockReverse).toHaveBeenCalled();
      expect(mockOffset).toHaveBeenCalledWith(0);
      expect(mockLimit).toHaveBeenCalledWith(PAGINATION.DEFAULT_PAGE_SIZE);
      expect(mockToArray).toHaveBeenCalled();
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
      expect(mockBetween).toHaveBeenCalledWith(
        ['v1', 0, Dexie.minKey],
        ['v1', 0, Dexie.maxKey],
        true,
        true
      );
      expect(mockReverse).not.toHaveBeenCalled();
      expect(result).toEqual(expectedComments);
    });

    it('should apply filters (hearted and links)', async () => {
      const filters = { heart: true, links: true };
      const mockFilteredData = [sampleComment2];
      mockFilter.mockImplementation((filterFn) => {
        mockToArray.mockResolvedValue(
          [sampleComment1, sampleComment2, sampleComment3].filter(filterFn)
        );
        // Filter returns a collection
        return collectionMethods;
      });
      const resultPromise = loadPagedComments(mockTable, 'v1', 0, 10, 'date', 'desc', filters);
      vi.runAllTimers();
      const result = await resultPromise;
      expect(mockFilter).toHaveBeenCalled();
      expect(result).toEqual(mockFilteredData);
    });

    it('should apply search keyword', async () => {
      const searchKeyword = 'link';
      const mockFilteredData = [sampleComment2];
      mockFilter.mockImplementation((filterFn) => {
        mockToArray.mockResolvedValue(
          [sampleComment1, sampleComment2, sampleComment3].filter(filterFn)
        );
        // Filter returns a collection
        return collectionMethods;
      });
      const resultPromise = loadPagedComments(
        mockTable,
        'v1',
        0,
        10,
        'date',
        'desc',
        { /* no-op */ },
        searchKeyword
      );
      vi.runAllTimers();
      const result = await resultPromise;
      expect(mockFilter).toHaveBeenCalled();
      expect(result).toEqual(mockFilteredData);
    });

    it('should handle "random" sort', async () => {
      const allComments = [sampleComment1, sampleComment2, sampleComment3];
      mockToArray.mockResolvedValueOnce(allComments);
      mockToArray.mockResolvedValueOnce(allComments);

      const result = await loadPagedComments(mockTable, 'v1', 0, 2, 'random', 'desc');

      expect(mockCommentsTable.where).toHaveBeenCalledWith('[videoId+replyLevel+publishedDate]');
      expect(mockBetween).toHaveBeenCalled();
      expect(mockToArray).toHaveBeenCalledTimes(2);

      expect(result.length).toBe(2);
      expect(allComments).toEqual(expect.arrayContaining(result));
    });

    it('should return empty array on validation error (invalid page)', async () => {
      const result = await loadPagedComments(mockTable, 'v1', -1);
      expect(result).toEqual([]);
      expect(mockCommentsTable.where).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Invalid page number'));
    });

    it('should return empty array on database error', async () => {
      const error = new Error('Dexie Error');
      mockToArray.mockRejectedValue(error);

      const result = await loadPagedComments(mockTable, 'v1');

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error loading paged comments'),
        error
      );
    });

    it('should apply sorting by author ascending', async () => {
      const fetchedComments = [sampleComment1, sampleComment2, sampleComment3];
      const expectedSorted = [sampleComment1, sampleComment3, sampleComment2];
      mockToArray.mockResolvedValue(fetchedComments);

      const result = await loadPagedComments(mockTable, 'v1', 0, 10, 'author', 'asc');

      expect(mockCommentsTable.where).toHaveBeenCalledWith('[videoId+replyLevel+author]');
      expect(mockToArray).toHaveBeenCalled();
      expect(result).toEqual(expectedSorted);
    });

    it('should apply multiple filters (timestamp and member)', async () => {
      const filters = { timestamps: true, members: true };
      const mockFilteredData = [sampleComment2];
      mockFilter.mockImplementation((filterFn) => {
        mockToArray.mockResolvedValue(
          [sampleComment1, sampleComment2, sampleComment3].filter(filterFn)
        );
        // Filter returns a collection
        return collectionMethods;
      });
      const resultPromise = loadPagedComments(mockTable, 'v1', 0, 10, 'date', 'desc', filters);
      vi.runAllTimers();
      const result = await resultPromise;
      expect(mockFilter).toHaveBeenCalled();
      expect(result).toEqual(mockFilteredData);
    });

    it('should perform case-insensitive search', async () => {
      const searchKeyword = 'LINK';
      const mockFilteredData = [sampleComment2];
      mockFilter.mockImplementation((filterFn) => {
        mockToArray.mockResolvedValue(
          [sampleComment1, sampleComment2, sampleComment3].filter(filterFn)
        );
        // Filter returns a collection
        return collectionMethods;
      });
      const resultPromise = loadPagedComments(
        mockTable,
        'v1',
        0,
        10,
        'date',
        'desc',
        { /* no-op */ },
        searchKeyword
      );
      vi.runAllTimers();
      const result = await resultPromise;
      expect(mockFilter).toHaveBeenCalled();
      expect(result).toEqual(mockFilteredData);
    });

    it('should return empty array when no comments match filters/search', async () => {
      const filters = { donated: true };
      const searchKeyword = 'nonexistentword';
      mockFilter.mockImplementation((filterFn) => {
        mockToArray.mockResolvedValue(
          [sampleComment1, sampleComment2, sampleComment3].filter(filterFn)
        );
        // Filter returns a collection
        return collectionMethods;
      });
      const resultPromise = loadPagedComments(
        mockTable,
        'v1',
        0,
        10,
        'date',
        'desc',
        filters,
        searchKeyword
      );
      vi.runAllTimers();
      const result = await resultPromise;
      expect(mockFilter).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should return empty array for a page beyond the total number of comments', async () => {
      const page = 5;
      const pageSize = 10;
      mockOffset.mockImplementation(() => {
        mockLimit.mockImplementation(() => {
          mockToArray.mockResolvedValue([]);
          // Limit returns a collection
          return collectionMethods;
        });
        // Offset returns a collection
        return collectionMethods;
      });
      const result = await loadPagedComments(mockTable, 'v1', page, pageSize);
      expect(mockOffset).toHaveBeenCalledWith(page * pageSize);
      expect(mockLimit).toHaveBeenCalledWith(pageSize);
      expect(mockToArray).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

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

      const result = await countComments(mockTable, 'v1', { /* no-op */ }, '', { topLevelOnly: true });

      expect(mockCommentsTable.where).toHaveBeenCalledWith('[videoId+replyLevel]');
      expect(mockBetween).toHaveBeenCalledWith(['v1', 0], ['v1', 0], true, true);
      expect(mockFilter).not.toHaveBeenCalled();
      expect(mockCount).toHaveBeenCalled();
      expect(result).toBe(expectedCount);
    });

    it('should apply filters and search when counting', async () => {
      const filters = { timestamps: true };
      const searchKeyword = 'test';
      const expectedCount = 1;
      mockFilter.mockImplementation((filterFn) => {
        const filtered = [sampleComment1, sampleComment2, sampleComment3].filter(filterFn);
        mockCount.mockResolvedValue(filtered.length);
        return collectionMethods;
      });

      const resultPromise = countComments(mockTable, 'v1', filters, searchKeyword);
      vi.runAllTimers();
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
      const expectedCount = 1;
      mockFilter.mockImplementation((filterFn) => {
        const filtered = [sampleComment1, sampleComment2, sampleComment3].filter(filterFn);
        mockCount.mockResolvedValue(filtered.length);
        return collectionMethods;
      });

      const resultPromise = countComments(mockTable, 'v1', filters, searchKeyword, {
        topLevelOnly: true,
      });
      vi.runAllTimers();
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
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error counting comments'),
        error
      );
    });

    it('should count comments matching multiple filters', async () => {
      // Reset all mocks from previous tests to ensure clean slate
      resetMocks();

      const filters = { hasLinks: true, isHearted: true };
      const expectedCount = 1;

      // Create a spy that we can verify is called
      const countSpy = vi.fn().mockResolvedValue(expectedCount);

      // Set up the mock chain very explicitly
      mockEquals.mockImplementation(() => {
        console.log('equals mock called, returning object with filter method');
        return {
          filter: vi.fn().mockImplementation((filterFn) => {
            console.log('filter mock called within equals chain');
            // Check that our filter actually works as expected on sample data
            const filteredData = [sampleComment1, sampleComment2, sampleComment3].filter(filterFn);
            console.log(`Filter function applied, filtered ${filteredData.length} items`);

            // Return an object with count method
            return {
              count: countSpy,
            };
          }),
        };
      });

      console.log('Running countComments...');
      const result = await countComments(mockTable, 'v1', filters);
      console.log('countComments returned:', result);

      expect(mockCommentsTable.where).toHaveBeenCalledWith('videoId');
      expect(mockEquals).toHaveBeenCalledWith('v1');
      // Check that the count spy was called
      expect(countSpy).toHaveBeenCalled();
      expect(result).toBe(expectedCount);
    });

    it('should return 0 when counting and no comments match criteria', async () => {
      const filters = { isDonated: true };
      const searchKeyword = 'qwertyuiop';
      const expectedCount = 0;
      const mockFilteredCollection = {
        ...collectionMethods,
        count: vi.fn().mockResolvedValue(expectedCount),
      };
      mockFilter.mockImplementation((filterFn) => {
        const actualFiltered = [sampleComment1, sampleComment2, sampleComment3].filter(filterFn);
        expect(actualFiltered.length).toBe(expectedCount);
        // Filter returns a collection
        return mockFilteredCollection;
      });
      const resultPromise = countComments(mockTable, 'v1', filters, searchKeyword);
      vi.runAllTimers();
      const result = await resultPromise;
      expect(mockFilter).toHaveBeenCalled();
      expect(mockFilteredCollection.count).toHaveBeenCalled();
      expect(result).toBe(expectedCount);
    });
  });

  describe('fetchRepliesForComment', () => {
    it('should fetch replies for a given parent comment', async () => {
      const parentId = 'c1';
      const expectedReplies = [sampleReply1];
      mockAnd.mockImplementation((filterFn) => {
        mockToArray.mockResolvedValue([sampleReply1].filter(filterFn));
        // `and` is part of the query chain
        return queryMethods;
      });
      const resultPromise = fetchRepliesForComment(mockTable, 'v1', parentId);
      vi.runAllTimers();
      const result = await resultPromise;
      expect(mockCommentsTable.where).toHaveBeenCalledWith('videoId');
      expect(mockEquals).toHaveBeenCalledWith('v1');
      expect(mockAnd).toHaveBeenCalled();
      expect(mockToArray).toHaveBeenCalled();
      expect(result).toEqual(expectedReplies);
    });

    it('should return an empty array if no replies are found', async () => {
      const parentId = 'c2';
      mockAnd.mockImplementation(() => {
        mockToArray.mockResolvedValue([]);
        // `and` is part of the query chain
        return queryMethods;
      });
      mockFirst.mockResolvedValue({ ...sampleComment2, replyCount: 0 });
      const resultPromise = fetchRepliesForComment(mockTable, 'v1', parentId);
      vi.runAllTimers();
      const result = await resultPromise;
      expect(result).toEqual([]);
      expect(mockCommentsTable.where).toHaveBeenCalledWith('videoId');
      expect(mockEquals).toHaveBeenCalledWith('v1');
      expect(mockAnd).toHaveBeenCalled();
      expect(mockToArray).toHaveBeenCalled();
      expect(mockCommentsTable.where).toHaveBeenCalledWith('commentId');
      expect(mockEquals).toHaveBeenCalledWith(parentId);
      expect(mockFirst).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          'No replies found, and parent comment does not indicate any replies'
        )
      );
    });

    it('should return an empty array and log warning if parent expects replies but none found', async () => {
      const parentId = 'c3';
      mockAnd.mockImplementation(() => {
        mockToArray.mockResolvedValue([]);
        // `and` is part of the query chain
        return queryMethods;
      });
      mockFirst.mockResolvedValue({ ...sampleComment3, replyCount: 1 });
      const resultPromise = fetchRepliesForComment(mockTable, 'v1', parentId);
      vi.runAllTimers();
      const result = await resultPromise;
      expect(result).toEqual([]);
      expect(mockCommentsTable.where).toHaveBeenCalledWith('commentId');
      expect(mockEquals).toHaveBeenCalledWith(parentId);
      expect(mockFirst).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'No replies found in DB, but parent comment (replyCount: 1) indicates replies should exist.'
        )
      );
    });

    it('should return empty array on database error', async () => {
      const parentId = 'c1';
      const error = new Error('Dexie Fetch Error');
      mockAnd.mockImplementation(() => {
        mockToArray.mockRejectedValue(error);
        // `and` is part of the query chain
        return queryMethods;
      });
      const result = await fetchRepliesForComment(mockTable, 'v1', parentId);
      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch replies'),
        error
      );
    });

    it('should return empty array on validation error (missing parentId)', async () => {
      const result = await fetchRepliesForComment(mockTable, 'v1', '');
      expect(result).toEqual([]);
      expect(mockCommentsTable.where).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('parentId is required'));
    });

    it('should fetch multiple replies for a comment', async () => {
      const parentId = 'c1';
      const expectedReplies = [sampleReply1, sampleReply2];
      mockAnd.mockImplementation((filterFn) => {
        mockToArray.mockResolvedValue([sampleReply1, sampleReply2].filter(filterFn));
        // `and` is part of the query chain
        return queryMethods;
      });
      const resultPromise = fetchRepliesForComment(mockTable, 'v1', parentId);
      vi.runAllTimers();
      const result = await resultPromise;
      expect(mockAnd).toHaveBeenCalled();
      expect(mockToArray).toHaveBeenCalled();
      expect(result).toEqual(expect.arrayContaining(expectedReplies));
      expect(result.length).toBe(expectedReplies.length);
    });

    it('should return empty array and log info if parent comment does not exist', async () => {
      const parentId = 'nonExistentParent';
      mockAnd.mockImplementation(() => {
        mockToArray.mockResolvedValue([]);
        // `and` is part of the query chain
        return queryMethods;
      });
      mockFirst.mockResolvedValue(undefined);
      const resultPromise = fetchRepliesForComment(mockTable, 'v1', parentId);
      vi.runAllTimers();
      const result = await resultPromise;
      expect(result).toEqual([]);
      expect(mockCommentsTable.where).toHaveBeenCalledWith('commentId');
      expect(mockEquals).toHaveBeenCalledWith(parentId);
      expect(mockFirst).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          'No replies found, and parent comment does not indicate any replies (or parent not found)'
        )
      );
    });
  });
});
