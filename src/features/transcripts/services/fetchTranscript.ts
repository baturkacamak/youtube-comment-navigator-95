import { fetchTranscriptFromLocal } from './localFetch';
import { isLocalEnvironment } from '../../shared/utils/environmentVariables';
import { fetchTranscriptFromRemote, fetchCaptionTrackBaseUrl } from "./remoteFetch";

declare var ytInitialPlayerResponse: any;

export const fetchTranscript = async (language: string = '') => {
    if (isLocalEnvironment()) {
        return fetchTranscriptFromLocal();
    } else {
        let captionTrackBaseUrl = ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks[0]?.baseUrl;
        if (!captionTrackBaseUrl) {
            captionTrackBaseUrl = await fetchCaptionTrackBaseUrl();
        }
        return fetchTranscriptFromRemote(captionTrackBaseUrl, language);
    }
};