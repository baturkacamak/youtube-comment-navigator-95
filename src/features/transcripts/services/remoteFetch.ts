// src/features/transcripts/services/remoteFetch.ts
import { processTranscriptData, ProcessedTranscript } from '../utils/processTranscriptData';
import {extractYouTubeVideoIdFromUrl} from "../../shared/utils/extractYouTubeVideoIdFromUrl";

export const fetchTranscriptFromRemote = async (): Promise<ProcessedTranscript | null> => {
    try {
        const videoId = extractYouTubeVideoIdFromUrl();
        const response = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`);
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
