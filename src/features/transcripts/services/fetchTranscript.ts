// src/features/transcripts/services/fetchTranscript.ts
import { fetchTranscriptFromLocal } from './localFetch';
import { fetchTranscriptFromRemote } from './remoteFetch';
import { isLocalEnvironment } from '../../shared/utils/environmentVariables';

export const fetchTranscript = async () => {
    if (isLocalEnvironment()) {
        return fetchTranscriptFromLocal();
    } else {
        return fetchTranscriptFromRemote();
    }
};
