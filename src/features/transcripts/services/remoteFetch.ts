// src/features/transcripts/services/remoteFetch.ts
import { ProcessedTranscript, processTranscriptData } from '../utils/processTranscriptData';
import { extractYouTubeVideoIdFromUrl } from "../../shared/utils/extractYouTubeVideoIdFromUrl";
import { youtubeApi } from '../../shared/services/youtubeApi';


export const fetchTranscriptFromRemote = async (captionTrackBaseUrl: string, language: string = ''): Promise<ProcessedTranscript | null> => {
    try {
        const url = language ? `${captionTrackBaseUrl}&fmt=json3&tlang=${language}` : `${captionTrackBaseUrl}&fmt=json3`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Failed to fetch transcript from remote");
        }
        const data = await response.json();
        return processTranscriptData(data);
    } catch (error) {
        console.error("Failed to fetch transcript from remote:", error);
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
        console.error("Failed to fetch video details:", error);
        return null;
    }
};
