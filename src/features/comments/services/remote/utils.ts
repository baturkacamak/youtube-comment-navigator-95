// src/features/comments/services/remote/utils.ts

import {extractYouTubeVideoIdFromUrl} from "../../../shared/utils/extractYouTubeVideoIdFromUrl";
import {isLocalEnvironment} from "../../../shared/utils/appConstants";
import {db} from "../../../shared/utils/database/database";

export const getVideoId = (): string => {
    let videoId = extractYouTubeVideoIdFromUrl();
    if (isLocalEnvironment()) {
        videoId = 'localVideoId';
    }
    if (!videoId) {
        throw new Error('Video ID not found');
    }
    return videoId;
};

export const storeContinuationToken = (token: string, continuationTokenKey: string) => {
    localStorage.setItem(continuationTokenKey, token);
};

export const retrieveLocalContinuationToken = (continuationTokenKey: string): string | null => {
    return localStorage.getItem(continuationTokenKey) ?? null;
};

export const clearLocalContinuationToken = (continuationTokenKey: string) => {
    localStorage.removeItem(continuationTokenKey);
};

export const fetchCachedComments = async (videoId: string) => {
    return db.comments.where('videoId').equals(videoId).toArray();
};

export const deleteExistingComments = async (videoId: string) => {
    await db.comments.where('videoId').equals(videoId).delete();
};
