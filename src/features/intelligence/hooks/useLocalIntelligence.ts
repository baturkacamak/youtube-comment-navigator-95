import { useCallback } from 'react';
import { useAIAvailability } from '@baturkacamak/extension-ai-react';
import { getBuiltInAIAvailability } from '../services/aiService';

export type AIStatus = 'checking' | 'unavailable' | 'download-required' | 'ready';

export const useLocalIntelligence = () => {
  const check = useCallback(() => getBuiltInAIAvailability(), []);
  const { status: availability, refresh } = useAIAvailability(check);
  const status: AIStatus =
    availability === 'checking'
      ? 'checking'
      : availability === 'available'
        ? 'ready'
        : availability === 'downloadable' || availability === 'downloading'
          ? 'download-required'
          : 'unavailable';

  return { status, capabilities: null, refresh };
};
