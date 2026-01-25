/**
 * Database service layer for LiveChat operations
 * Handles all database interactions for livechat messages with extensive error handling
 */

import { db } from '../../../shared/utils/database/database';
import {
  LiveChatMessage,
  LiveChatFilter,
  LiveChatError,
  LiveChatErrorType
} from '../../../../types/liveChatTypes';
import { Comment } from '../../../../types/commentTypes';
import logger from '../../../shared/utils/logger';

/**
 * Creates a structured error for livechat operations
 */
function createLiveChatError(
  type: LiveChatErrorType,
  message: string,
  originalError?: Error,
  context?: Record<string, unknown>
): LiveChatError {
  return {
    type,
    message,
    originalError,
    context,
    timestamp: Date.now()
  };
}

/**
 * Save livechat messages to the database
 * @param messages Array of livechat messages to save
 * @param videoId Video ID for logging/validation
 * @returns Number of messages saved
 * @throws LiveChatError if save operation fails
 */
export async function saveLiveChatMessages(
  messages: LiveChatMessage[],
  videoId: string
): Promise<number> {
  try {
    if (!messages || messages.length === 0) {
      logger.warn('[LiveChatDB] No messages to save');
      return 0;
    }

    if (!videoId) {
      throw createLiveChatError(
        LiveChatErrorType.DATABASE_ERROR,
        'videoId is required to save livechat messages',
        undefined,
        { messageCount: messages.length }
      );
    }

    logger.info(`[LiveChatDB] Saving ${messages.length} livechat messages for video ${videoId}`);

    // Validate messages before saving
    const validMessages = messages.filter(msg => {
      if (!msg.messageId) {
        logger.warn('[LiveChatDB] Skipping message without messageId', { message: msg });
        return false;
      }
      if (!msg.videoId) {
        logger.warn('[LiveChatDB] Adding videoId to message', { messageId: msg.messageId });
        msg.videoId = videoId;
      }
      
      // Ensure timestampMs is present (critical for sorting)
      if (msg.timestampMs === undefined || msg.timestampMs === null) {
        logger.warn('[LiveChatDB] Message missing timestampMs, defaulting to 0', { messageId: msg.messageId });
        msg.timestampMs = 0;
      }

      return true;
    });

    if (validMessages.length === 0) {
      throw createLiveChatError(
        LiveChatErrorType.DATABASE_ERROR,
        'No valid messages to save after validation',
        undefined,
        { originalCount: messages.length }
      );
    }

    // Check for existing messages to prevent duplicates
    const messageIds = validMessages.map(m => m.messageId);
    const existingMessages = await db.liveChatMessages
      .where('messageId')
      .anyOf(messageIds)
      .toArray();

    const existingIds = new Set(existingMessages.map(m => m.messageId));
    const newMessages = validMessages.filter(msg => !existingIds.has(msg.messageId));

    if (newMessages.length === 0) {
      logger.info(`[LiveChatDB] All ${validMessages.length} messages already exist in DB, skipping save`);
      return 0;
    }

    if (newMessages.length < validMessages.length) {
      logger.info(`[LiveChatDB] ${validMessages.length - newMessages.length} messages already exist, saving ${newMessages.length} new messages`);
    }

    // Use bulkAdd for new messages only
    await db.liveChatMessages.bulkAdd(newMessages);

    logger.success(`[LiveChatDB] Successfully saved ${newMessages.length} new messages`);
    return newMessages.length;
  } catch (error: any) {
    logger.error('[LiveChatDB] Failed to save livechat messages:', error);

    if (error.type && error.type in LiveChatErrorType) {
      throw error; // Re-throw if already a LiveChatError
    }

    throw createLiveChatError(
      LiveChatErrorType.DATABASE_ERROR,
      `Failed to save livechat messages: ${error.message}`,
      error,
      { videoId, messageCount: messages.length }
    );
  }
}

/**
 * Load livechat messages for a video with pagination
 * @param videoId Video ID to load messages for
 * @param offset Number of messages to skip
 * @param limit Maximum number of messages to return
 * @param filter Optional filter criteria
 * @returns Array of livechat messages
 * @throws LiveChatError if load operation fails
 */
export async function loadLiveChatMessages(
  videoId: string,
  offset: number = 0,
  limit: number = 100,
  filter?: LiveChatFilter
): Promise<LiveChatMessage[]> {
  try {
    if (!videoId) {
      throw createLiveChatError(
        LiveChatErrorType.DATABASE_ERROR,
        'videoId is required to load livechat messages'
      );
    }

    logger.info(`[LiveChatDB] Loading livechat messages for video ${videoId}`, {
      offset,
      limit,
      filter
    });

    let collection = db.liveChatMessages.where('videoId').equals(videoId);

    // Apply filters
    if (filter) {
      if (filter.startTime !== undefined) {
        collection = collection.and(msg => msg.timestampMs >= (filter.startTime || 0));
      }
      if (filter.endTime !== undefined) {
        collection = collection.and(msg => msg.timestampMs <= (filter.endTime || Infinity));
      }
      if (filter.includeDonations === false) {
        collection = collection.and(msg => !msg.isDonation);
      }
      if (filter.includeMembers === false) {
        collection = collection.and(msg => !msg.isMembership);
      }
      if (filter.includeModerators === false) {
        collection = collection.and(msg => !msg.isModerator);
      }
      if (filter.searchTerm) {
        const searchLower = filter.searchTerm.toLowerCase();
        collection = collection.and(msg =>
          msg.message.toLowerCase().includes(searchLower) ||
          msg.author.toLowerCase().includes(searchLower)
        );
      }
    }

    // Sort by timestamp (chronological order for transcript view)
    // We use in-memory sort to ensure messages with missing timestamps are included
    // (Dexie's sortBy uses the index which excludes records with missing keys)
    const allMessages = await collection.toArray();
    const messages = allMessages.sort((a, b) => (a.timestampMs || 0) - (b.timestampMs || 0));

    // Apply pagination
    const paginatedMessages = messages.slice(offset, offset + limit);

    logger.success(`[LiveChatDB] Loaded ${paginatedMessages.length} messages (total: ${messages.length})`);
    return paginatedMessages;
  } catch (error: any) {
    logger.error('[LiveChatDB] Failed to load livechat messages:', error);

    if (error.type && error.type in LiveChatErrorType) {
      throw error;
    }

    throw createLiveChatError(
      LiveChatErrorType.DATABASE_ERROR,
      `Failed to load livechat messages: ${error.message}`,
      error,
      { videoId, offset, limit, filter }
    );
  }
}

/**
 * Get total count of livechat messages for a video
 * @param videoId Video ID
 * @returns Number of messages
 * @throws LiveChatError if count operation fails
 */
export async function getLiveChatMessageCount(videoId: string): Promise<number> {
  try {
    if (!videoId) {
      throw createLiveChatError(
        LiveChatErrorType.DATABASE_ERROR,
        'videoId is required to count livechat messages'
      );
    }

    const count = await db.liveChatMessages
      .where('videoId')
      .equals(videoId)
      .count();

    logger.info(`[LiveChatDB] Message count for video ${videoId}: ${count}`);
    return count;
  } catch (error: any) {
    logger.error('[LiveChatDB] Failed to count livechat messages:', error);

    if (error.type && error.type in LiveChatErrorType) {
      throw error;
    }

    throw createLiveChatError(
      LiveChatErrorType.DATABASE_ERROR,
      `Failed to count livechat messages: ${error.message}`,
      error,
      { videoId }
    );
  }
}

/**
 * Save a reply to a livechat message as a Comment in the database
 * @param reply Reply data conforming to Comment interface
 * @param parentMessageId ID of the parent livechat message
 * @returns Saved comment ID
 * @throws LiveChatError if save operation fails
 */
export async function saveLiveChatReply(
  reply: Comment,
  parentMessageId: string
): Promise<number> {
  try {
    if (!reply) {
      throw createLiveChatError(
        LiveChatErrorType.DATABASE_ERROR,
        'Reply data is required'
      );
    }

    if (!parentMessageId) {
      throw createLiveChatError(
        LiveChatErrorType.DATABASE_ERROR,
        'parentMessageId is required to save livechat reply',
        undefined,
        { reply }
      );
    }

    logger.info(`[LiveChatDB] Saving reply to livechat message ${parentMessageId}`);

    // Ensure reply has correct flags
    const replyWithFlags: Comment = {
      ...reply,
      isLiveChat: true, // Mark as livechat-related
      commentParentId: parentMessageId, // Link to parent message
      replyLevel: 1 // Direct reply to livechat message
    };

    const id = await db.comments.add(replyWithFlags);
    logger.success(`[LiveChatDB] Saved reply with ID ${id}`);

    // Update parent message reply count
    await incrementMessageReplyCount(parentMessageId);

    return id;
  } catch (error: any) {
    logger.error('[LiveChatDB] Failed to save livechat reply:', error);

    if (error.type && error.type in LiveChatErrorType) {
      throw error;
    }

    throw createLiveChatError(
      LiveChatErrorType.DATABASE_ERROR,
      `Failed to save livechat reply: ${error.message}`,
      error,
      { parentMessageId, reply }
    );
  }
}

/**
 * Load replies for a livechat message
 * @param parentMessageId ID of the parent livechat message
 * @returns Array of reply comments
 * @throws LiveChatError if load operation fails
 */
export async function loadLiveChatReplies(parentMessageId: string): Promise<Comment[]> {
  try {
    if (!parentMessageId) {
      throw createLiveChatError(
        LiveChatErrorType.DATABASE_ERROR,
        'parentMessageId is required to load livechat replies'
      );
    }

    logger.info(`[LiveChatDB] Loading replies for message ${parentMessageId}`);

    const replies = await db.comments
      .where('commentParentId')
      .equals(parentMessageId)
      .and(comment => comment.isLiveChat === true)
      .sortBy('publishedDate');

    logger.success(`[LiveChatDB] Loaded ${replies.length} replies`);
    return replies;
  } catch (error: any) {
    logger.error('[LiveChatDB] Failed to load livechat replies:', error);

    if (error.type && error.type in LiveChatErrorType) {
      throw error;
    }

    throw createLiveChatError(
      LiveChatErrorType.DATABASE_ERROR,
      `Failed to load livechat replies: ${error.message}`,
      error,
      { parentMessageId }
    );
  }
}

/**
 * Increment reply count for a livechat message
 * @param messageId Message ID to update
 * @throws LiveChatError if update operation fails
 */
async function incrementMessageReplyCount(messageId: string): Promise<void> {
  try {
    const message = await db.liveChatMessages
      .where('messageId')
      .equals(messageId)
      .first();

    if (message) {
      const currentCount = message.replyCount || 0;
      await db.liveChatMessages
        .where('messageId')
        .equals(messageId)
        .modify({ replyCount: currentCount + 1, hasReplies: true });

      logger.info(`[LiveChatDB] Incremented reply count for message ${messageId} to ${currentCount + 1}`);
    } else {
      logger.warn(`[LiveChatDB] Message ${messageId} not found for reply count update`);
    }
  } catch (error: any) {
    logger.error('[LiveChatDB] Failed to increment reply count:', error);
    // Don't throw - this is a non-critical update
  }
}

/**
 * Delete all livechat messages for a video
 * @param videoId Video ID
 * @returns Number of messages deleted
 * @throws LiveChatError if delete operation fails
 */
export async function deleteLiveChatMessages(videoId: string): Promise<number> {
  try {
    if (!videoId) {
      throw createLiveChatError(
        LiveChatErrorType.DATABASE_ERROR,
        'videoId is required to delete livechat messages'
      );
    }

    logger.info(`[LiveChatDB] Deleting livechat messages for video ${videoId}`);

    const count = await db.liveChatMessages
      .where('videoId')
      .equals(videoId)
      .delete();

    logger.success(`[LiveChatDB] Deleted ${count} messages`);
    return count;
  } catch (error: any) {
    logger.error('[LiveChatDB] Failed to delete livechat messages:', error);

    if (error.type && error.type in LiveChatErrorType) {
      throw error;
    }

    throw createLiveChatError(
      LiveChatErrorType.DATABASE_ERROR,
      `Failed to delete livechat messages: ${error.message}`,
      error,
      { videoId }
    );
  }
}

/**
 * Delete livechat replies (comments) for a video
 * @param videoId Video ID
 * @returns Number of replies deleted
 * @throws LiveChatError if delete operation fails
 */
export async function deleteLiveChatReplies(videoId: string): Promise<number> {
  try {
    if (!videoId) {
      throw createLiveChatError(
        LiveChatErrorType.DATABASE_ERROR,
        'videoId is required to delete livechat replies'
      );
    }

    logger.info(`[LiveChatDB] Deleting livechat replies for video ${videoId}`);

    // Delete all comments that are marked as livechat (isLiveChat = true)
    const count = await db.comments
      .where('videoId')
      .equals(videoId)
      .and(comment => comment.isLiveChat === true)
      .delete();

    logger.success(`[LiveChatDB] Deleted ${count} livechat replies`);
    return count;
  } catch (error: any) {
    logger.error('[LiveChatDB] Failed to delete livechat replies:', error);

    if (error.type && error.type in LiveChatErrorType) {
      throw error;
    }

    throw createLiveChatError(
      LiveChatErrorType.DATABASE_ERROR,
      `Failed to delete livechat replies: ${error.message}`,
      error,
      { videoId }
    );
  }
}

/**
 * Check if livechat messages already exist for a video
 * @param videoId Video ID
 * @returns True if messages exist, false otherwise
 */
export async function hasLiveChatMessages(videoId: string): Promise<boolean> {
  try {
    if (!videoId) {
      return false;
    }

    const count = await db.liveChatMessages
      .where('videoId')
      .equals(videoId)
      .count();

    logger.info(`[LiveChatDB] Video ${videoId} has ${count} livechat messages`);
    return count > 0;
  } catch (error: any) {
    logger.error('[LiveChatDB] Failed to check for existing livechat messages:', error);
    return false;
  }
}

/**
 * Bookmark a livechat message
 * @param messageId Message ID to bookmark
 * @param note Optional note to add to bookmark
 * @throws LiveChatError if bookmark operation fails
 */
export async function bookmarkLiveChatMessage(
  messageId: string,
  note?: string
): Promise<void> {
  try {
    if (!messageId) {
      throw createLiveChatError(
        LiveChatErrorType.DATABASE_ERROR,
        'messageId is required to bookmark message'
      );
    }

    logger.info(`[LiveChatDB] Bookmarking message ${messageId}`);

    const updated = await db.liveChatMessages
      .where('messageId')
      .equals(messageId)
      .modify({
        isBookmarked: true,
        bookmarkAddedDate: new Date().toISOString(),
        note: note || undefined
      });

    if (updated === 0) {
      throw createLiveChatError(
        LiveChatErrorType.DATABASE_ERROR,
        `Message ${messageId} not found`,
        undefined,
        { messageId }
      );
    }

    logger.success(`[LiveChatDB] Bookmarked message ${messageId}`);
  } catch (error: any) {
    logger.error('[LiveChatDB] Failed to bookmark message:', error);

    if (error.type && error.type in LiveChatErrorType) {
      throw error;
    }

    throw createLiveChatError(
      LiveChatErrorType.DATABASE_ERROR,
      `Failed to bookmark message: ${error.message}`,
      error,
      { messageId, note }
    );
  }
}

/**
 * Remove bookmark from a livechat message
 * @param messageId Message ID to unbookmark
 * @throws LiveChatError if unbookmark operation fails
 */
export async function unbookmarkLiveChatMessage(messageId: string): Promise<void> {
  try {
    if (!messageId) {
      throw createLiveChatError(
        LiveChatErrorType.DATABASE_ERROR,
        'messageId is required to unbookmark message'
      );
    }

    logger.info(`[LiveChatDB] Removing bookmark from message ${messageId}`);

    const updated = await db.liveChatMessages
      .where('messageId')
      .equals(messageId)
      .modify({
        isBookmarked: false,
        bookmarkAddedDate: undefined,
        note: undefined
      });

    if (updated === 0) {
      throw createLiveChatError(
        LiveChatErrorType.DATABASE_ERROR,
        `Message ${messageId} not found`,
        undefined,
        { messageId }
      );
    }

    logger.success(`[LiveChatDB] Removed bookmark from message ${messageId}`);
  } catch (error: any) {
    logger.error('[LiveChatDB] Failed to unbookmark message:', error);

    if (error.type && error.type in LiveChatErrorType) {
      throw error;
    }

    throw createLiveChatError(
      LiveChatErrorType.DATABASE_ERROR,
      `Failed to unbookmark message: ${error.message}`,
      error,
      { messageId }
    );
  }
}

/**
 * Get bookmarked livechat messages for a video
 * @param videoId Video ID
 * @returns Array of bookmarked messages
 * @throws LiveChatError if load operation fails
 */
export async function getBookmarkedLiveChatMessages(videoId: string): Promise<LiveChatMessage[]> {
  try {
    if (!videoId) {
      throw createLiveChatError(
        LiveChatErrorType.DATABASE_ERROR,
        'videoId is required to get bookmarked messages'
      );
    }

    logger.info(`[LiveChatDB] Loading bookmarked messages for video ${videoId}`);

    const messages = await db.liveChatMessages
      .where('[videoId+isBookmarked]')
      .equals([videoId, 1])
      .sortBy('bookmarkAddedDate');

    logger.success(`[LiveChatDB] Loaded ${messages.length} bookmarked messages`);
    return messages;
  } catch (error: any) {
    logger.error('[LiveChatDB] Failed to load bookmarked messages:', error);

    if (error.type && error.type in LiveChatErrorType) {
      throw error;
    }

    throw createLiveChatError(
      LiveChatErrorType.DATABASE_ERROR,
      `Failed to load bookmarked messages: ${error.message}`,
      error,
      { videoId }
    );
  }
}
