// src/features/transcripts/services/remoteFetch.ts
import { ProcessedTranscript, processTranscriptData } from '../utils/processTranscriptData';
import { extractYouTubeVideoIdFromUrl } from '../../shared/utils/extractYouTubeVideoIdFromUrl';
import { youtubeApi } from '../../shared/services/youtubeApi';
import httpService from '../../shared/services/httpService';

interface TranscriptRequestOptions {
  language?: string;
  potToken?: string;
}

interface TranscriptRequestVariant {
  label: string;
  url: string;
}

const removeVariantParam = (url: string): string => {
  const urlObj = new URL(url);
  urlObj.searchParams.delete('variant');
  return urlObj.toString();
};

export const buildTranscriptRequestUrl = (
  url: string,
  { language, potToken }: TranscriptRequestOptions = {}
): string => {
  const urlObj = new URL(url);
  urlObj.searchParams.set('fmt', 'json3');
  urlObj.searchParams.set('c', 'WEB');

  if (language) {
    const baseLanguage = urlObj.searchParams.get('lang');
    if (baseLanguage !== language) {
      urlObj.searchParams.set('tlang', language);
    } else {
      urlObj.searchParams.delete('tlang');
    }
  } else {
    urlObj.searchParams.delete('tlang');
  }

  if (potToken) {
    urlObj.searchParams.set('pot', potToken);
    urlObj.searchParams.set('potc', '1');
  }

  return urlObj.toString();
};

const buildTranscriptRequestVariants = (
  url: string,
  { language, potToken }: TranscriptRequestOptions = {}
): TranscriptRequestVariant[] => {
  const variants: TranscriptRequestVariant[] = [];
  const seen = new Set<string>();

  const pushVariant = (label: string, value: string) => {
    if (!seen.has(value)) {
      seen.add(value);
      variants.push({ label, url: value });
    }
  };

  pushVariant('json3-with-pot', buildTranscriptRequestUrl(url, { language, potToken }));
  pushVariant(
    'json3-with-pot-no-variant',
    buildTranscriptRequestUrl(removeVariantParam(url), { language, potToken })
  );

  const jsonOnlyUrl = new URL(url);
  jsonOnlyUrl.searchParams.set('fmt', 'json3');
  if (language) {
    const baseLanguage = jsonOnlyUrl.searchParams.get('lang');
    if (baseLanguage !== language) {
      jsonOnlyUrl.searchParams.set('tlang', language);
    }
  }
  pushVariant('json3-no-pot', jsonOnlyUrl.toString());
  pushVariant('json3-no-pot-no-variant', removeVariantParam(jsonOnlyUrl.toString()));

  pushVariant('raw-base-url', url);
  pushVariant('raw-base-url-no-variant', removeVariantParam(url));

  return variants;
};

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
  if (!url) {
    throw new Error('Transcript base URL not found.');
  }

  // 1. Try to get the intercepted POT token first (most reliable)
  // Wait up to 3 seconds for the injected script to find it
  let potToken = await youtubeApi.waitForPotToken(3000);

  if (!potToken) {
    // 2. Fallback: Try to fetch player response manually (might not contain POT if request is clean)
    try {
      const playerResponse = await youtubeApi.fetchPlayer();
      potToken = playerResponse?.serviceIntegrityDimensions?.poToken;
    } catch {
      // Ignore fallback player fetch failures and continue with other variants.
    }
  }

  const variants = buildTranscriptRequestVariants(url, { language, potToken });

  let response = '';
  let data: any = null;
  let lastError: unknown = null;

  for (const variant of variants) {
    try {
      response = await youtubeApi.fetchTimedText(variant.url);
      if (!response.trim()) {
        throw new Error('Timedtext response body was empty');
      }

      data = JSON.parse(response);
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!data) {
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  // Assuming the response is the raw transcript data that needs processing
  const processed = processTranscriptData(data);
  return processed;
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
  const response = await httpService.get(url);

  // The response is a string that needs to be parsed to find the captionTracks JSON
  const captionTracksJson = response.split('"captionTracks":')[1];
  if (!captionTracksJson) {
    throw new Error('Caption tracks not found in the response.');
  }

  const captionTracksDataString = captionTracksJson.split(',"videoDetails"')[0];
  const captionTracks: CaptionTracksResponse = JSON.parse(captionTracksDataString);

  if (captionTracks.captionTracks?.[0]?.baseUrl) {
    return captionTracks.captionTracks[0].baseUrl;
  }

  throw new Error('Transcript base URL not found.');
}

export const fetchCaptionTrackBaseUrl = async (): Promise<string | null> => {
  try {
    const videoId = extractYouTubeVideoIdFromUrl();

    // Use the new YouTube API service to fetch player data
    const data = await youtubeApi.fetchPlayer(videoId);
    const captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

    const baseUrl = captionTracks[0]?.baseUrl || null;

    return baseUrl;
  } catch {
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
        return null;
    }
};
*/
