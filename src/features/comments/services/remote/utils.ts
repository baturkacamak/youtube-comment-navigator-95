// src/features/comments/services/remote/utils.ts

import {extractYouTubeVideoIdFromUrl} from "../../../shared/utils/extractYouTubeVideoIdFromUrl";
import {isLocalEnvironment} from "../../../shared/utils/appConstants";
import {db} from "../../../shared/utils/database/database";

export const getVideoId = (): string => {
    try {
        let videoId = extractYouTubeVideoIdFromUrl();
        if (isLocalEnvironment()) {
            videoId = 'localVideoId';
        }
        if (!videoId) {
            throw new Error('Video ID not found in the current URL');
        }
        return videoId;
    } catch (error) {
        console.error('Failed to extract video ID:', error);
        throw error;
    }
};

export const storeContinuationToken = (token: string, continuationTokenKey: string): boolean => {
    try {
        if (!token || !continuationTokenKey) {
            throw new Error('Token or continuationTokenKey is missing');
        }
        localStorage.setItem(continuationTokenKey, token);
        return true;
    } catch (error) {
        console.error('Failed to store continuation token:', error);
        return false;
    }
};

export const retrieveLocalContinuationToken = (continuationTokenKey: string): string | null => {
    try {
        if (!continuationTokenKey) {
            throw new Error('continuationTokenKey is missing');
        }
        return localStorage.getItem(continuationTokenKey) ?? null;
    } catch (error) {
        console.error('Failed to retrieve continuation token:', error);
        return null;
    }
};

export const clearLocalContinuationToken = (continuationTokenKey: string): boolean => {
    try {
        if (!continuationTokenKey) {
            throw new Error('continuationTokenKey is missing');
        }
        localStorage.removeItem(continuationTokenKey);
        return true;
    } catch (error) {
        console.error('Failed to clear continuation token:', error);
        return false;
    }
};

export const fetchCachedComments = async (videoId: string) => {
    try {
        if (!videoId) {
            throw new Error('VideoId is required to fetch cached comments');
        }
        return await db.comments.where('videoId').equals(videoId).toArray();
    } catch (error) {
        console.error('Failed to fetch cached comments:', error);
        throw error;
    }
};

export const deleteExistingComments = async (videoId: string): Promise<boolean> => {
    try {
        if (!videoId) {
            throw new Error('VideoId is required to delete comments');
        }
        await db.comments.where('videoId').equals(videoId).delete();
        return true;
    } catch (error) {
        console.error('Failed to delete existing comments:', error);
        return false;
    }
};
