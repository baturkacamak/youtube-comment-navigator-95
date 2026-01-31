import { useState, useEffect } from 'react';
import { AIModelCapabilities } from '../types/window.ai';

export type AIStatus = 'checking' | 'unavailable' | 'download-required' | 'ready';

export const useLocalIntelligence = () => {
  const [status, setStatus] = useState<AIStatus>('checking');
  const [capabilities, setCapabilities] = useState<AIModelCapabilities | null>(null);

  useEffect(() => {
    const checkAI = async () => {
      try {
        if (!window.ai || !window.ai.languageModel) {
          setStatus('unavailable');
          return;
        }

        const caps = await window.ai.languageModel.capabilities();
        setCapabilities(caps);

        if (caps.available === 'readily') {
          setStatus('ready');
        } else if (caps.available === 'after-download') {
          setStatus('download-required');
        } else {
          setStatus('unavailable');
        }
      } catch (e) {
        console.error('Failed to check AI capabilities:', e);
        setStatus('unavailable');
      }
    };

    checkAI();
  }, []);

  return { status, capabilities };
};
