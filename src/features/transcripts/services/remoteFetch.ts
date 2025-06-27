// src/features/transcripts/services/remoteFetch.ts
import { ProcessedTranscript, processTranscriptData } from '../utils/processTranscriptData';
import { extractYouTubeVideoIdFromUrl } from "../../shared/utils/extractYouTubeVideoIdFromUrl";
import { youtubeApi } from '../../shared/services/youtubeApi';
import logger from '../../shared/utils/logger';


export const fetchTranscriptFromRemote = async (captionTrackBaseUrl: string, language: string = ''): Promise<ProcessedTranscript | null> => {
    try {
        const url = language ? `${captionTrackBaseUrl}&fmt=json3&tlang=${language}` : `${captionTrackBaseUrl}&fmt=json3`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch transcript from remote: ${response.status} ${response.statusText}`);
        }

        // Check if response has content
        const contentLength = response.headers.get('content-length');
        if (contentLength === '0') {
            logger.warn('Received empty response from transcript API');
            return null;
        }

        // Get the response text first to check if it's valid
        const responseText = await response.text();
        if (!responseText || responseText.trim() === '') {
            logger.warn('Received empty or whitespace-only response from transcript API');
            return null;
        }

        // Try to parse as JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            logger.error('Failed to parse transcript response as JSON:', parseError);
            logger.error('Response text:', responseText.substring(0, 500)); // Log first 500 chars for debugging
            return null;
        }

        return processTranscriptData(data);
    } catch (error) {
        logger.error("Failed to fetch transcript from remote:", error);
        return null;
    }
};

export const fetchCaptionTrackBaseUrl = async (): Promise<string | null> => {
    try {
        const videoId = extractYouTubeVideoIdFromUrl();
        
        // Use the new YouTube API service to fetch player data
        const data = await youtubeApi.fetchPlayer(videoId);
        
        return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks[0]?.baseUrl || null;
    } catch (error) {
        logger.error("Failed to fetch video details:", error);
        return null;
    }
};

/*
// This seems to be using a non-existent API key. Commenting out for now.
export const fetchVideoDetails = async (): Promise<{ title: string; channel: string } | null> => {
    const videoId = extractYouTubeVideoIdFromUrl();
    if (!videoId) return null;

    const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        const snippet = data.items[0]?.snippet;
        if (!snippet) return null;
        return {title: snippet.title, channel: snippet.channelTitle};
    } catch (error) {
        logger.error("Failed to fetch video details:", error);
        return null;
    }
};
*/
