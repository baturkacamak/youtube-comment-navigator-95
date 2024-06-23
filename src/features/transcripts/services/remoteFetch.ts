import {ProcessedTranscript, processTranscriptData} from '../utils/processTranscriptData';

declare var ytInitialPlayerResponse: any;

export const fetchTranscriptFromRemote = async (): Promise<ProcessedTranscript | null> => {
    try {
        const captionTrackBaseUrl = ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks[0]?.baseUrl;
        const response = await fetch(`${captionTrackBaseUrl}&fmt=json3`);

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
