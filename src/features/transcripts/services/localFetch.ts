// src/features/transcripts/services/localFetch.ts
import { isLocalEnvironment } from '../../shared/utils/appConstants';
import { ProcessedTranscript } from '../utils/processTranscriptData';
import logger from '../../shared/utils/logger';
import httpService from '../../shared/services/httpService';

const transcriptFile = '/example-comments/transcript.json';

export const fetchTranscriptFromLocal = async (): Promise<ProcessedTranscript | null> => {
  if (!isLocalEnvironment()) {
    throw new Error('Local fetch should only be used in a local environment.');
  }

  try {
    const response = await fetch(transcriptFile);
    if (!response.ok) {
      throw new Error(`Failed to fetch transcript from ${transcriptFile}`);
    }
    const data = await response.json();
    return data as ProcessedTranscript;
  } catch (error) {
    logger.error('Failed to fetch transcript from local:', error);
    return null;
  }
};

/**
 * Fetches a transcript from a local file.
 * @param transcriptFile The path to the transcript file.
 * @returns A promise that resolves to the transcript data.
 */
export async function localFetch(transcriptFile: string): Promise<ProcessedTranscript> {
  const response = await httpService.get(transcriptFile);
  const data = JSON.parse(response);

  // Assuming the fetched data is an array of transcript entries
  // The actual processing might be needed here if the raw data isn't in the correct format.
  // For now, we cast it, assuming the local file is already processed.
  return data as ProcessedTranscript;
}
