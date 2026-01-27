// src/features/transcripts/services/remoteFetch.ts
import { ProcessedTranscript, processTranscriptData } from '../utils/processTranscriptData';
import { extractYouTubeVideoIdFromUrl } from '../../shared/utils/extractYouTubeVideoIdFromUrl';
import { youtubeApi } from '../../shared/services/youtubeApi';
import logger from '../../shared/utils/logger';
import httpService from '../../shared/services/httpService';

/**
 * Fetches a transcript from a remote URL.
 * @param url The URL to fetch the transcript from.
 * @param language Optional language code.
 * @returns A promise that resolves to the processed transcript data.
 */
export async function fetchTranscriptFromRemote(
  url: string,
  language?: string
): Promise<ProcessedTranscript> {
  try {
    logger.debug('Fetching transcript from remote URL:', url);
    logger.debug('Language:', language);
    const urlObj = new URL(url);
    urlObj.searchParams.set('fmt', 'json3');
    urlObj.searchParams.set('c', 'WEB');

    // 1. Try to get the intercepted POT token first (most reliable)
    // Wait up to 3 seconds for the injected script to find it
    let potToken = await youtubeApi.waitForPotToken(3000);

    if (potToken) {
      logger.debug('Using intercepted POT token:', potToken);
      urlObj.searchParams.set('pot', potToken);
      urlObj.searchParams.set('potc', '1');
    } else {
      // 2. Fallback: Try to fetch player response manually (might not contain POT if request is clean)
      logger.warn(
        'Intercepted POT token not available after wait. Attempting to fetch from player API...'
      );
      try {
        const playerResponse = await youtubeApi.fetchPlayer();
        potToken = playerResponse?.serviceIntegrityDimensions?.poToken;

        if (potToken) {
          logger.debug('Found POT token from manual player fetch:', potToken);
          urlObj.searchParams.set('pot', potToken);
          urlObj.searchParams.set('potc', '1');
        } else {
          logger.warn('POT token not found in manual player response either.', playerResponse);
        }
      } catch (e) {
        logger.error('Error fetching player response for POT token:', e);
      }
    }

    const finalUrl = urlObj.toString();
    logger.debug('Fetching transcript from URL:', finalUrl);

    const response = await httpService.get(finalUrl);
    const data = JSON.parse(response);

    // Assuming the response is the raw transcript data that needs processing
    return processTranscriptData(data);
  } catch (error) {
    logger.error('Failed to fetch transcript from remote:', {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Represents the structure of the caption tracks response from YouTube.
 */
interface CaptionTracksResponse {
  captionTracks?: {
    baseUrl: string;
  }[];
}

/**
 * Fetches the caption tracks from a remote URL to find the transcript URL.
 * @param url The URL to fetch the caption tracks from.
 * @returns A promise that resolves to the base URL of the transcript.
 */
export async function fetchCaptionTracks(url: string): Promise<string> {
  try {
    const response = await httpService.get(url);

    // The response is a string that needs to be parsed to find the captionTracks JSON
    const captionTracksJson = response.split('"captionTracks":')[1];
    if (!captionTracksJson) {
      logger.warn('Could not find captionTracks in the response.', { url });
      throw new Error('Caption tracks not found in the response.');
    }

    const captionTracksDataString = captionTracksJson.split(',"videoDetails"')[0];
    const captionTracks: CaptionTracksResponse = JSON.parse(captionTracksDataString);

    if (captionTracks.captionTracks?.[0]?.baseUrl) {
      return captionTracks.captionTracks[0].baseUrl;
    } else {
      logger.warn('Base URL for transcript not found in caption tracks.', { url });
      throw new Error('Transcript base URL not found.');
    }
  } catch (error) {
    logger.error('Failed to fetch or parse caption tracks:', {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export const fetchCaptionTrackBaseUrl = async (): Promise<string | null> => {
  try {
    const videoId = extractYouTubeVideoIdFromUrl();

    // Use the new YouTube API service to fetch player data
    const data = await youtubeApi.fetchPlayer(videoId);

    return data?.captions?.playerCaptionsTracklistRenderer?.captionTracks[0]?.baseUrl || null;
  } catch (error) {
    logger.error('Failed to fetch video details:', error);
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
