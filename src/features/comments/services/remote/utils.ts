// src/features/comments/services/remote/utils.ts

import { CACHE_KEYS } from '../../../shared/utils/appConstants';
import { db } from '../../../shared/utils/database/database';
import { Comment } from '../../../../types/commentTypes';
import logger from '../../../shared/utils/logger';

export const extractVideoId = (): string => {
  try {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'mock-video-id';
    }
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v') ?? '';
  } catch (error) {
    logger.error('Failed to extract video ID:', error);
    return '';
  }
};

export const storeContinuationToken = async (videoId: string, token: string): Promise<void> => {
  try {
    await db.setItem(CACHE_KEYS.CONTINUATION_TOKEN(videoId), token);
  } catch (error) {
    logger.error('Failed to store continuation token:', error);
  }
};

export const getContinuationToken = async (videoId: string): Promise<string | null> => {
  try {
    return await db.getItem<string>(CACHE_KEYS.CONTINUATION_TOKEN(videoId));
  } catch (error) {
    logger.error('Failed to retrieve continuation token:', error);
    return null;
  }
};

export const clearContinuationToken = async (videoId: string): Promise<void> => {
  try {
    await db.removeItem(CACHE_KEYS.CONTINUATION_TOKEN(videoId));
  } catch (error) {
    logger.error('Failed to clear continuation token:', error);
  }
};

export const getCachedComments = async (videoId: string): Promise<Comment[] | null> => {
  try {
    return await db.comments.where('videoId').equals(videoId).toArray();
  } catch (error) {
    logger.error('Failed to fetch cached comments:', error);
    return null;
  }
};

export const deleteCommentsFromDb = async (videoId: string): Promise<void> => {
  try {
    await db.comments.where('videoId').equals(videoId).delete();
  } catch (error) {
    logger.error('Failed to delete existing comments:', error);
  }
};
