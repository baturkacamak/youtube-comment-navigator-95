import { fetchTranscriptFromLocal } from './localFetch';
import { isLocalEnvironment } from '../../shared/utils/appConstants';
import { fetchTranscriptFromRemote, fetchCaptionTrackBaseUrl } from "./remoteFetch";
import {extractYouTubeVideoIdFromUrl} from "../../shared/utils/extractYouTubeVideoIdFromUrl";

export const fetchTranscript = async (language: string = '') => {
    if (isLocalEnvironment()) {
        return fetchTranscriptFromLocal();
    } else {
        // Try to get caption track URL from page context via message
        // Since content scripts can't access page variables directly, always fetch from remote
        try {
            const captionTrackBaseUrl = await fetchCaptionTrackBaseUrl();
            
            if (!captionTrackBaseUrl) {
                throw new Error('Caption track base URL is not available');
            }
            
            return fetchTranscriptFromRemote(captionTrackBaseUrl, language);
        } catch (error) {
            console.error('[YCN-Transcript] Failed to fetch caption track base URL:', error);
            throw new Error('Unable to fetch transcript: Could not retrieve caption track URL');
        }
    }
};