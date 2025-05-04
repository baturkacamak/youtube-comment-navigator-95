// src/features/transcripts/services/localFetch.ts
import { isLocalEnvironment } from '../../shared/utils/appConstants.ts';
import {ProcessedTranscript, processTranscriptData} from "../../transcripts/utils/processTranscriptData";

const transcriptFile = '/example-comments/transcript.json';

export const fetchTranscriptFromLocal = async (): Promise<ProcessedTranscript | null> => {
    if (!isLocalEnvironment()) {
        throw new Error("Local fetch should only be used in a local environment.");
    }

    try {
        const response = await fetch(transcriptFile);
        if (!response.ok) {
            throw new Error(`Failed to fetch transcript from ${transcriptFile}`);
        }
        const data = await response.json();
        return processTranscriptData(data);
    } catch (error) {
        console.error("Failed to fetch transcript from local:", error);
        return null;
    }
};
