import { fetchTranscriptFromLocal } from './localFetch';
import { isLocalEnvironment } from '../../shared/utils/appConstants';
import { fetchTranscriptFromRemote, fetchCaptionTrackBaseUrl } from './remoteFetch';
import { extractYouTubeVideoIdFromUrl } from '../../shared/utils/extractYouTubeVideoIdFromUrl';

declare let ytInitialPlayerResponse: any;

interface TranscriptDiagnosticsPayload {
  currentVideoId?: string | null;
  readyState?: string;
  locationHref?: string;
  hasYtInitialPlayerResponse?: boolean;
  hasYtInitialData?: boolean;
  hasYtcfg?: boolean;
  hasMoviePlayer?: boolean;
  selectedPlayerResponseSource?: string | null;
  selectedPlayerResponseVideoId?: string | null;
  moviePlayerResponseVideoId?: string | null;
  initialPlayerResponseVideoId?: string | null;
  playerState?: number | null;
  currentVideoUrl?: string | null;
  responseVideoId?: string | null;
  responsePlayabilityStatus?: string | null;
  responsePlayabilityReason?: string | null;
  hasCaptions?: boolean;
  captionTrackCount?: number;
  firstCaptionTrack?: {
    baseUrl?: string | null;
    baseUrlPreview?: string | null;
    languageCode?: string | null;
    kind?: string | null;
    vssId?: string | null;
  } | null;
  innertubeClientName?: string | null;
  innertubeClientVersion?: string | null;
  error?: string;
}

const requestTranscriptDiagnosticsOnce = async (
  timeoutMs: number = 1500
): Promise<TranscriptDiagnosticsPayload | null> => {
  const requestId = `diag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return new Promise((resolve) => {
    let settled = false;

    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeoutHandle);
    };

    const finish = (payload: TranscriptDiagnosticsPayload | null) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(payload);
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type !== 'YCN_TRANSCRIPT_DIAGNOSTICS') return;
      if (event.data?.requestId !== requestId) return;
      finish((event.data?.payload || null) as TranscriptDiagnosticsPayload | null);
    };

    const timeoutHandle = window.setTimeout(() => {
      finish(null);
    }, timeoutMs);

    window.addEventListener('message', handleMessage);
    window.postMessage({ type: 'YCN_REQUEST_TRANSCRIPT_DIAGNOSTICS', requestId }, '*');
  });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const requestTranscriptDiagnostics = async (
  videoId: string,
  timeoutMs: number = 4000,
  intervalMs: number = 250
): Promise<TranscriptDiagnosticsPayload | null> => {
  const deadline = Date.now() + timeoutMs;
  let lastPayload: TranscriptDiagnosticsPayload | null = null;

  while (Date.now() < deadline) {
    lastPayload = await requestTranscriptDiagnosticsOnce(Math.min(intervalMs, 1000));

    const payloadVideoId = lastPayload?.responseVideoId || lastPayload?.currentVideoId || null;
    const payloadTrackUrl = lastPayload?.firstCaptionTrack?.baseUrl || '';
    const payloadTrackVideoId = extractYouTubeVideoIdFromUrl(payloadTrackUrl);
    const videoMatches =
      payloadVideoId === videoId || (payloadTrackVideoId && payloadTrackVideoId === videoId);

    if (videoMatches && lastPayload?.firstCaptionTrack?.baseUrl) {
      return lastPayload;
    }

    await sleep(intervalMs);
  }

  return lastPayload;
};

export const fetchTranscript = async (language: string = '') => {
  if (isLocalEnvironment()) {
    return fetchTranscriptFromLocal();
  } else {
    let captionTrackBaseUrl = null;
    const videoId = extractYouTubeVideoIdFromUrl();

    const transcriptDiagnostics = await requestTranscriptDiagnostics(videoId);

    try {
      // Check if variable exists before accessing
      if (typeof ytInitialPlayerResponse !== 'undefined') {
        captionTrackBaseUrl =
          ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks[0]
            ?.baseUrl;
      }
    } catch (error) {}

    if (!captionTrackBaseUrl && transcriptDiagnostics?.firstCaptionTrack?.baseUrl) {
      captionTrackBaseUrl = transcriptDiagnostics.firstCaptionTrack.baseUrl;
    }

    const captionVideoId = extractYouTubeVideoIdFromUrl(captionTrackBaseUrl);

    if (!captionTrackBaseUrl || videoId !== captionVideoId) {
      captionTrackBaseUrl = await fetchCaptionTrackBaseUrl();
    }

    if (!captionTrackBaseUrl) {
      throw new Error('Transcript base URL not found.');
    }

    return fetchTranscriptFromRemote(captionTrackBaseUrl, language);
  }
};
