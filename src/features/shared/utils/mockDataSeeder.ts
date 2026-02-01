import { db } from './database/database';
import { Comment } from '../../../types/commentTypes';
import logger from './logger';
import mockCommentsData from '../../../comments.json';
import {
  setComments,
  setTotalCommentsCount,
  setIsLoading,
  setTranscripts,
  setFilteredTranscripts,
  setLiveChat,
  setLiveChatMessageCount,
} from '../../../store/store';
import { PAGINATION } from './appConstants';
import { loadPagedComments, countComments } from '../../comments/services/pagination';

const MOCK_VIDEO_ID = 'mock-video-id';

export const seedMockData = async (dispatch: any) => {
    dispatch(setIsLoading(true));

  try {
    // Check if data already exists to avoid re-seeding every time
    const existingCount = await db.comments.where('videoId').equals(MOCK_VIDEO_ID).count();
    const jsonCount = mockCommentsData.length;

    if (existingCount === 0 || existingCount !== jsonCount) {
      if (existingCount === 0) { /* no-op */ } else {
                await db.comments.where('videoId').equals(MOCK_VIDEO_ID).delete();
      }

      // Process raw JSON into Comment objects
      // We need to ensure the data matches the Comment interface and has the mock video ID
      const commentsToInsert: Comment[] = (mockCommentsData as any[]).map((raw: any) => ({
        ...raw,
        videoId: MOCK_VIDEO_ID,
        // Ensure required fields are present and correctly typed
        likes: typeof raw.likes === 'number' ? raw.likes : parseInt(raw.viewLikes || '0', 10),
        replyCount: typeof raw.replyCount === 'number' ? raw.replyCount : 0,
        replyLevel: raw.replyLevel || 0,
        publishedDate: raw.publishedDate || Date.now(),
        author: raw.author || 'Mock User',
        content: raw.content || '',
        commentId: raw.commentId || `mock-${Math.random()}`,
        // Add missing fields with defaults
        authorAvatarUrl: raw.authorAvatarUrl || '',
        authorChannelId: raw.authorChannelId || '',
        isAuthorContentCreator: !!raw.isAuthorContentCreator,
        isMember: !!raw.isMember,
        hasLinks: !!raw.hasLinks,
        hasTimestamp: !!raw.hasTimestamp,
        isHearted: !!raw.isHearted,
        isDonated: !!raw.isDonated,
        authorBadgeUrl: raw.authorBadgeUrl || '',
        authorMemberSince: raw.authorMemberSince || '',
        donationAmount: raw.donationAmount || '',
        viewLikes: raw.viewLikes || '0',
        videoTitle: 'Mock Video Title',
        wordCount: raw.content ? raw.content.split(/\s+/).length : 0,
      }));

      // Bulk add to IndexedDB for performance
      await db.comments.bulkAdd(commentsToInsert);
      logger.success(
        `[MockDataSeeder] Successfully seeded ${commentsToInsert.length} mock comments.`
      );
    } else { /* no-op */ }

    // Now load the initial page of comments from the DB, just like the real app does
    const initialComments = await loadPagedComments(
      db.comments,
      MOCK_VIDEO_ID,
      PAGINATION.INITIAL_PAGE,
      PAGINATION.DEFAULT_PAGE_SIZE,
      'date',
      'desc',
      { /* no-op */ },
      '',
      { excludeLiveChat: true }
    );

    const totalCount = await countComments(db.comments, MOCK_VIDEO_ID, { /* no-op */ }, '', {
      excludeLiveChat: true,
    });

    dispatch(setTotalCommentsCount(totalCount));
    dispatch(setComments(initialComments));

    // Mock Transcripts
    const mockTranscripts = Array.from({ length: 50 }, (_, i) => ({
      start: i * 5,
      duration: 4,
      text: `Mock transcript line ${i + 1} - This is a test line.`,
    }));
    dispatch(setTranscripts(mockTranscripts));
    dispatch(setFilteredTranscripts(mockTranscripts));

    // Mock Live Chat
    const mockLiveChat: any[] = Array.from({ length: 20 }, (_, i) => ({
      messageId: `lc-${i}`,
      videoId: MOCK_VIDEO_ID,
      author: `Chatter ${i}`,
      authorChannelId: `channel-${i}`,
      authorAvatarUrl: '',
      isAuthorContentCreator: false,
      message: `Live chat message ${i + 1}`,
      timestampUsec: `${Date.now() - 1000 * i}000`,
      timestampMs: Date.now() - 1000 * i,
      publishedDate: Date.now() - 1000 * i,
      published: new Date(Date.now() - 1000 * i).toISOString(),
      videoOffsetTimeSec: i * 10,
      isBookmarked: false,
      // Legacy fields if needed by some components, but messageId is key
      id: i,
      authorName: `Chatter ${i}`, // Legacy
      contextMenuEndpointParams: '', // Legacy
    }));

    await db.liveChatMessages.bulkPut(mockLiveChat); // Save to DB

    dispatch(setLiveChat(mockLiveChat));
    dispatch(setLiveChatMessageCount(20));

    logger.success('[MockDataSeeder] Mock data loaded to state and DB.');
  } catch (error) {
    logger.error('[MockDataSeeder] Failed to seed mock data:', error);
  } finally {
    dispatch(setIsLoading(false));
  }
};
