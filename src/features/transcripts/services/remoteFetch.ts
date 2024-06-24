// src/features/transcripts/services/remoteFetch.ts
import { ProcessedTranscript, processTranscriptData } from '../utils/processTranscriptData';
import { extractYouTubeVideoIdFromUrl } from "../../shared/utils/extractYouTubeVideoIdFromUrl";


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

        const hl = navigator.language || 'en';
        const gl = 'TR';
        const payload = {
            context: {
                client: {
                    hl,
                    gl,
                    userAgent: navigator.userAgent,
                    clientName: "WEB",
                    clientVersion: "2.20240620.05.00",
                    originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    mainAppWebInfo: {
                        graftUrl: `/watch?v=${videoId}`,
                    }
                },
            },
            videoId,
            playbackContext: {
                contentPlaybackContext: {
                    currentUrl: `/watch?v=${videoId}`,
                }
            },
        };

        const response = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false&ycn=95", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "*/*",
                "Accept-Language": navigator.language,
                "x-youtube-client-name": "1",
                "x-youtube-client-version": "2.20240620.05.00",
                "Origin": window.location.origin
            },
            body: JSON.stringify(payload),
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error("Failed to fetch video details");
        }

        const data = await response.json();
        return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks[0]?.baseUrl || null;
    } catch (error) {
        console.error("Failed to fetch video details:", error);
        return null;
    }
};
