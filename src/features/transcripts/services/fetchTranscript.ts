import { fetchTranscriptFromLocal } from './localFetch';
import { isLocalEnvironment } from '../../shared/utils/appConstants';
import { fetchTranscriptFromRemote, fetchCaptionTrackBaseUrl } from "./remoteFetch";
import {extractYouTubeVideoIdFromUrl} from "../../shared/utils/extractYouTubeVideoIdFromUrl";

declare var ytInitialPlayerResponse: any;

export const fetchTranscript = async (language: string = '') => {
    if (isLocalEnvironment()) {
        return fetchTranscriptFromLocal();
    } else {
        let captionTrackBaseUrl = ytInitialPlayerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks[0]?.baseUrl;
        let videoId = extractYouTubeVideoIdFromUrl();
        let captionVideoId = extractYouTubeVideoIdFromUrl(captionTrackBaseUrl);
        if (!captionTrackBaseUrl || videoId !== captionVideoId) {
            captionTrackBaseUrl = await fetchCaptionTrackBaseUrl();
        }
        return fetchTranscriptFromRemote(captionTrackBaseUrl, language);
    }
};