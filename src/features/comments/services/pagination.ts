// src/features/comments/services/pagination.ts
import { Comment } from '../../../types/commentTypes';
import Dexie from 'dexie';
import { PAGINATION } from '../../shared/utils/appConstants';

interface RangeFilter {
  min?: number | string;
  max?: number | string;
}

interface DateRangeFilter {
  start?: string;
  end?: string;
}

interface CommentFilters {
  timestamps?: boolean;
  heart?: boolean;
  links?: boolean;
  members?: boolean;
  donated?: boolean;
  creator?: boolean;
  verified?: boolean;
  hasLinks?: boolean;
  isHearted?: boolean;
  isMember?: boolean;
  isDonated?: boolean;
  isAuthorContentCreator?: boolean;
  likesThreshold?: RangeFilter;
  repliesLimit?: RangeFilter;
  wordCount?: RangeFilter;
  dateTimeRange?: DateRangeFilter;
}

const DEFAULT_FILTERS: CommentFilters = {};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeRange = (range?: RangeFilter): { min: number; max: number } => {
  const minValue = toFiniteNumber(range?.min);
  const maxValue =
    range?.max === Infinity ? Infinity : (toFiniteNumber(range?.max) as number | null);

  const min = minValue !== null ? Math.max(0, minValue) : 0;
  const max = maxValue !== null ? maxValue : Infinity;

  return {
    min,
    max,
  };
};

const parseDateToMs = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const hasActiveRangeFilter = (range?: RangeFilter): boolean => {
  const normalized = normalizeRange(range);
  return normalized.min > 0 || normalized.max < Infinity;
};

const hasActiveDateRangeFilter = (dateRange?: DateRangeFilter): boolean => {
  return parseDateToMs(dateRange?.start) !== null || parseDateToMs(dateRange?.end) !== null;
};

const hasActiveCommentFilters = (filters: CommentFilters): boolean => {
  if (
    filters.timestamps ||
    filters.heart ||
    filters.links ||
    filters.members ||
    filters.donated ||
    filters.creator ||
    filters.verified ||
    filters.hasLinks ||
    filters.isHearted ||
    filters.isMember ||
    filters.isDonated ||
    filters.isAuthorContentCreator
  ) {
    return true;
  }

  if (
    hasActiveRangeFilter(filters.likesThreshold) ||
    hasActiveRangeFilter(filters.repliesLimit) ||
    hasActiveRangeFilter(filters.wordCount)
  ) {
    return true;
  }

  return hasActiveDateRangeFilter(filters.dateTimeRange);
};

const applyFiltersAndSearch = (
  comment: Comment,
  filters: CommentFilters,
  searchKeyword: string,
  options: { topLevelOnly?: boolean; excludeLiveChat?: boolean; onlyLiveChat?: boolean } = {}
): boolean => {
  // Ensure top-level only if specified, this check must be first
  if (options.topLevelOnly && comment.replyLevel !== 0) {
    return false;
  }

  // Live chat filtering
  if (options.excludeLiveChat && comment.isLiveChat) {
    return false;
  }

  if (options.onlyLiveChat && !comment.isLiveChat) {
    return false;
  }

  const requireTimestamp = filters.timestamps === true;
  const requireHeart = filters.heart === true || filters.isHearted === true;
  const requireLinks = filters.links === true || filters.hasLinks === true;
  const requireMembers = filters.members === true || filters.isMember === true;
  const requireDonated = filters.donated === true || filters.isDonated === true;
  const requireCreator =
    filters.creator === true ||
    filters.verified === true ||
    filters.isAuthorContentCreator === true;

  if (requireTimestamp && comment.hasTimestamp !== true) {
    return false;
  }
  if (requireHeart && comment.isHearted !== true) {
    return false;
  }
  if (requireLinks && comment.hasLinks !== true) {
    return false;
  }
  if (requireMembers && comment.isMember !== true) {
    return false;
  }
  if (requireDonated && comment.isDonated !== true) {
    return false;
  }
  if (requireCreator && comment.isAuthorContentCreator !== true) {
    return false;
  }

  const likesRange = normalizeRange(filters.likesThreshold);
  if (likesRange.min > 0 && comment.likes < likesRange.min) {
    return false;
  }
  if (likesRange.max < Infinity && comment.likes > likesRange.max) {
    return false;
  }

  const repliesRange = normalizeRange(filters.repliesLimit);
  if (repliesRange.min > 0 && comment.replyCount < repliesRange.min) {
    return false;
  }
  if (repliesRange.max < Infinity && comment.replyCount > repliesRange.max) {
    return false;
  }

  const commentWordCount = comment.wordCount || 0;
  const wordCountRange = normalizeRange(filters.wordCount);
  if (wordCountRange.min > 0 && commentWordCount < wordCountRange.min) {
    return false;
  }
  if (wordCountRange.max < Infinity && commentWordCount > wordCountRange.max) {
    return false;
  }

  const rangeStart = parseDateToMs(filters.dateTimeRange?.start);
  const rangeEnd = parseDateToMs(filters.dateTimeRange?.end);
  if (rangeStart !== null || rangeEnd !== null) {
    const commentDate = parseDateToMs(comment.publishedDate);
    if (commentDate === null) {
      return false;
    }
    if (rangeStart !== null && commentDate < rangeStart) {
      return false;
    }
    if (rangeEnd !== null && commentDate > rangeEnd) {
      return false;
    }
  }

  if (searchKeyword) {
    const normalizedKeyword = searchKeyword.toLowerCase();
    const inContent = comment.content?.toLowerCase().includes(normalizedKeyword);
    const inAuthor = comment.author?.toLowerCase().includes(normalizedKeyword);
    return Boolean(inContent || inAuthor);
  }

  return true;
};

export const loadPagedComments = async (
  commentsTable: Dexie.Table<Comment, number>,
  videoId: string,
  page: number = PAGINATION.INITIAL_PAGE,
  pageSize: number = PAGINATION.DEFAULT_PAGE_SIZE,
  sortBy: string = 'date',
  sortOrder: string = 'desc',
  filters: CommentFilters = DEFAULT_FILTERS,
  searchKeyword: string = '',
  options: { topLevelOnly?: boolean; excludeLiveChat?: boolean; onlyLiveChat?: boolean } = {}
): Promise<Comment[]> => {
  const timerId = `loadPagedComments-${videoId}-p${page}-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 5)}`;
  const logPrefix = `[loadPagedComments] videoId: ${videoId}, page ${page}`;

  if (!videoId) {
    return [];
  }
  if (typeof page !== 'number' || page < 0) {
    return [];
  }
  if (typeof pageSize !== 'number' || pageSize <= 0) {
    return [];
  }

  try {
    const offset = page * pageSize;
    const baseIndex = 'videoId+replyLevel';
    const buildIndexKey = (field: string) => `[${baseIndex}+${field}]`;

    const bounds = {
      lower: [videoId, 0, Dexie.minKey],
      upper: [videoId, 0, Dexie.maxKey],
    };

    const queryTimer = `${timerId}-querySetup`;
    let collection: Dexie.Collection<Comment, number>;
    switch (sortBy) {
      case 'date':
        collection = commentsTable
          .where(buildIndexKey('publishedDate'))
          .between(bounds.lower, bounds.upper, true, true);
        break;
      case 'likes':
        collection = commentsTable
          .where(buildIndexKey('likes'))
          .between(bounds.lower, bounds.upper, true, true);
        break;
      case 'replies':
        collection = commentsTable
          .where(buildIndexKey('replyCount'))
          .between(bounds.lower, bounds.upper, true, true);
        break;
      case 'author':
        collection = commentsTable
          .where(buildIndexKey('author'))
          .between(bounds.lower, bounds.upper, true, true);
        break;
      case 'normalized':
        collection = commentsTable
          .where(buildIndexKey('normalizedScore'))
          .between(bounds.lower, bounds.upper, true, true);
        break;
      case 'zscore':
        collection = commentsTable
          .where(buildIndexKey('weightedZScore'))
          .between(bounds.lower, bounds.upper, true, true);
        break;
      case 'bayesian':
        collection = commentsTable
          .where(buildIndexKey('bayesianAverage'))
          .between(bounds.lower, bounds.upper, true, true);
        break;
      case 'length':
        collection = commentsTable
          .where(buildIndexKey('wordCount'))
          .between(bounds.lower, bounds.upper, true, true);
        break;
      default:
        collection = commentsTable
          .where(buildIndexKey('publishedDate'))
          .between(bounds.lower, bounds.upper, true, true);
        break;
    }

    // Apply filters/search only when needed to avoid full scans on default filter objects.
    let filteredCollection = collection;
    if (
      hasActiveCommentFilters(filters) ||
      searchKeyword ||
      options.excludeLiveChat ||
      options.onlyLiveChat
    ) {
      const filterTimer = `${timerId}-applyingFiltersAndSearch`;
      filteredCollection = collection.filter((comment) =>
        applyFiltersAndSearch(comment, filters, searchKeyword, options)
      );
    }

    // Apply reverse before pagination for index-based sorts (excluding author/random).
    if (sortOrder === 'desc' && !['random', 'author'].includes(sortBy)) {
      filteredCollection = filteredCollection.reverse();
    }

    const arrayTimer = `${timerId}-toArray`;
    const pagedComments = await filteredCollection.offset(offset).limit(pageSize).toArray();

    if (sortBy === 'author') {
      pagedComments.sort((a, b) => {
        const result = a.author.localeCompare(b.author);
        return sortOrder === 'asc' ? result : -result;
      });
    }

    if (sortBy === 'random') {
      const scanTimer = `${timerId}-randomShuffle`;

      let allTopLevelCollection = commentsTable
        .where(buildIndexKey('publishedDate'))
        .between(bounds.lower, bounds.upper, true, true);

      allTopLevelCollection = allTopLevelCollection.filter((comment) =>
        applyFiltersAndSearch(comment, filters, searchKeyword, options)
      );

      const allTopLevel = await allTopLevelCollection.toArray();

      // Fisher-Yates shuffle (unbiased, O(n)).
      for (let i = allTopLevel.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allTopLevel[i], allTopLevel[j]] = [allTopLevel[j], allTopLevel[i]];
      }

      return allTopLevel.slice(offset, offset + pageSize);
    }

    return pagedComments;
  } catch (error) {
    return [];
  } finally {
  }
};

/**
 * Loads all comments matching the same criteria used for paged queries.
 * Useful for exports where pagination caps (e.g. first 20 items) should not apply.
 */
export const loadAllComments = async (
  commentsTable: Dexie.Table<Comment, number>,
  videoId: string,
  sortBy: string = 'date',
  sortOrder: string = 'desc',
  filters: CommentFilters = DEFAULT_FILTERS,
  searchKeyword: string = '',
  options: { topLevelOnly?: boolean; excludeLiveChat?: boolean; onlyLiveChat?: boolean } = {}
): Promise<Comment[]> => {
  const logPrefix = `[loadAllComments] videoId: ${videoId}`;

  if (!videoId) {
    return [];
  }

  try {
    const total = await countComments(commentsTable, videoId, filters, searchKeyword, options);
    if (total <= 0) {
      return [];
    }

    return await loadPagedComments(
      commentsTable,
      videoId,
      PAGINATION.INITIAL_PAGE,
      total,
      sortBy,
      sortOrder,
      filters,
      searchKeyword,
      options
    );
  } catch (error) {
    return [];
  }
};

/**
 * Counts total comments matching the criteria (including search).
 */
export const countComments = async (
  commentsTable: Dexie.Table<Comment, number>,
  videoId: string,
  filters: CommentFilters = DEFAULT_FILTERS,
  searchKeyword: string = '',
  options: { topLevelOnly?: boolean; excludeLiveChat?: boolean; onlyLiveChat?: boolean } = {}
): Promise<number> => {
  const timerId = `countComments-${videoId}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const logPrefix = `[countComments] video ${videoId}`;

  if (!videoId) {
    return 0;
  }

  try {
    let baseCollection: Dexie.Collection<Comment, number>;

    if (options.topLevelOnly) {
      baseCollection = commentsTable
        .where('[videoId+replyLevel]')
        .between([videoId, 0], [videoId, 0], true, true);
    } else {
      baseCollection = commentsTable.where('videoId').equals(videoId);
    }

    if (
      hasActiveCommentFilters(filters) ||
      searchKeyword ||
      options.excludeLiveChat ||
      options.onlyLiveChat
    ) {
      baseCollection = baseCollection.filter((comment) =>
        applyFiltersAndSearch(comment, filters, searchKeyword, options)
      );
    }

    return await baseCollection.count();
  } catch (error) {
    return 0;
  } finally {
  }
};

export const fetchRepliesForComment = async (
  commentsTable: Dexie.Table<Comment, number>,
  videoId: string,
  parentId: string
): Promise<Comment[]> => {
  const timerId = `fetchRepliesForComment-${parentId}-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 5)}`;
  const logPrefix = `[fetchRepliesForComment] videoId: ${videoId}, parentId: ${parentId}`;

  if (!videoId) {
    return [];
  }
  if (!parentId) {
    return [];
  }

  try {
    const replies = await commentsTable
      .where('videoId')
      .equals(videoId)
      .and((item) => item.replyLevel === 1 && item.commentParentId === parentId)
      .toArray();

    if (replies.length === 0) {
      const parentComment = await commentsTable.where('commentId').equals(parentId).first();
      const expectedReplies = parentComment?.replyCount || 0;

      if (expectedReplies > 0) {
      } else {
      }
    }

    return replies;
  } catch (err) {
    return [];
  } finally {
  }
};
