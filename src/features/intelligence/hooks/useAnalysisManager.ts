import { useState, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectGeminiApiKey } from '../../../store/selectors';
import { useLocalIntelligence } from './useLocalIntelligence';
import { CardId, CARD_CONFIGS } from '../constants/cardConfigs';
import { Comment } from '../../../types/commentTypes';

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

export interface CardState {
  status: AnalysisStatus;
  result: string | null;
  error: string | null;
  isExpanded: boolean;
}

export interface UseAnalysisManagerReturn {
  cardStates: Record<CardId, CardState>;
  isAnalyzing: boolean;
  completedCount: number;
  canAnalyze: boolean;
  analyzeCard: (cardId: CardId, comments: Comment[]) => Promise<void>;
  analyzeAll: (comments: Comment[]) => Promise<void>;
  clearCard: (cardId: CardId) => void;
  clearAll: () => void;
  cancelAll: () => void;
  toggleCardExpanded: (cardId: CardId) => void;
  setCardExpanded: (cardId: CardId, expanded: boolean) => void;
}

const createInitialCardState = (): CardState => ({
  status: 'idle',
  result: null,
  error: null,
  isExpanded: false,
});

const createInitialStates = (): Record<CardId, CardState> => {
  return CARD_CONFIGS.reduce(
    (acc, config) => {
      acc[config.id] = createInitialCardState();
      return acc;
    },
    {} as Record<CardId, CardState>
  );
};

export const useAnalysisManager = (): UseAnalysisManagerReturn => {
  const [cardStates, setCardStates] = useState<Record<CardId, CardState>>(createInitialStates);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const cancelRef = useRef(false);

  const apiKey = useSelector(selectGeminiApiKey);
  const { status: nanoStatus } = useLocalIntelligence();

  const isNanoReady = nanoStatus === 'ready';
  const hasApiKey = Boolean(apiKey && apiKey.length > 0);
  const canAnalyze = isNanoReady || hasApiKey;

  const completedCount = Object.values(cardStates).filter(
    (state) => state.status === 'success'
  ).length;

  const updateCardState = useCallback((cardId: CardId, updates: Partial<CardState>) => {
    setCardStates((prev) => ({
      ...prev,
      [cardId]: { ...prev[cardId], ...updates },
    }));
  }, []);

  const analyzeCard = useCallback(
    async (cardId: CardId, comments: Comment[]) => {
      if (!canAnalyze || comments.length === 0) return;

      const config = CARD_CONFIGS.find((c) => c.id === cardId);
      if (!config) return;

      updateCardState(cardId, { status: 'loading', error: null });

      try {
        const effectiveKey = isNanoReady ? undefined : apiKey;
        const result = await config.analyzer(comments, effectiveKey);
        updateCardState(cardId, {
          status: 'success',
          result,
          isExpanded: true,
        });
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Analysis failed.';
        updateCardState(cardId, {
          status: 'error',
          error: errorMessage,
        });
      }
    },
    [canAnalyze, isNanoReady, apiKey, updateCardState]
  );

  const analyzeAll = useCallback(
    async (comments: Comment[]) => {
      if (!canAnalyze || comments.length === 0) return;

      cancelRef.current = false;
      setIsAnalyzing(true);

      for (const config of CARD_CONFIGS) {
        if (cancelRef.current) break;

        // Skip already completed cards
        if (cardStates[config.id].status === 'success') continue;

        await analyzeCard(config.id, comments);

        // Small delay between requests to avoid rate limiting
        if (!cancelRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      setIsAnalyzing(false);
    },
    [canAnalyze, cardStates, analyzeCard]
  );

  const clearCard = useCallback((cardId: CardId) => {
    setCardStates((prev) => ({
      ...prev,
      [cardId]: createInitialCardState(),
    }));
  }, []);

  const clearAll = useCallback(() => {
    setCardStates(createInitialStates());
  }, []);

  const cancelAll = useCallback(() => {
    cancelRef.current = true;
    setIsAnalyzing(false);
  }, []);

  const toggleCardExpanded = useCallback((cardId: CardId) => {
    setCardStates((prev) => ({
      ...prev,
      [cardId]: { ...prev[cardId], isExpanded: !prev[cardId].isExpanded },
    }));
  }, []);

  const setCardExpanded = useCallback((cardId: CardId, expanded: boolean) => {
    setCardStates((prev) => ({
      ...prev,
      [cardId]: { ...prev[cardId], isExpanded: expanded },
    }));
  }, []);

  return {
    cardStates,
    isAnalyzing,
    completedCount,
    canAnalyze,
    analyzeCard,
    analyzeAll,
    clearCard,
    clearAll,
    cancelAll,
    toggleCardExpanded,
    setCardExpanded,
  };
};
