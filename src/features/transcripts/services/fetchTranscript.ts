import { fetchTranscriptFromLocal } from './localFetch';
import { isLocalEnvironment } from '../../shared/utils/appConstants';
import { fetchTranscriptFromRemote, fetchCaptionTrackBaseUrl } from './remoteFetch';
import { extractYouTubeVideoIdFromUrl } from '../../shared/utils/extractYouTubeVideoIdFromUrl';

declare let ytInitialPlayerResponse: any;

interface TranscriptDiagnosticsPayload {
  readyState?: string;
  locationHref?: string;
  hasYtInitialPlayerResponse?: boolean;
  hasYtInitialData?: boolean;
  hasYtcfg?: boolean;
  hasMoviePlayer?: boolean;
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

const requestTranscriptDiagnostics = async (
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

export const fetchTranscript = async (language: string = '') => {
  if (isLocalEnvironment()) {
    return fetchTranscriptFromLocal();
  } else {
    let captionTrackBaseUrl = null;
    const videoId = extractYouTubeVideoIdFromUrl();

    const transcriptDiagnostics = await requestTranscriptDiagnostics();

    try {
      // Check if variable exists before accessing
      if (typeof ytInitialPlayerResponse !== 'undefined') {
        captionTrackBaseUrl =
          ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks[0]
            ?.baseUrl;
      } else {
      }
    } catch (error) {
    }

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
