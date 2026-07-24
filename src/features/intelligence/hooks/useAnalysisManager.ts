import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  useAnalysisManager as useReusableAnalysisManager,
  type AnalysisState,
} from '@baturkacamak/extension-ai-react';
import { selectGeminiApiKey } from '../../../store/selectors';
import { useLocalIntelligence } from './useLocalIntelligence';
import { CardId, CARD_CONFIGS } from '../constants/cardConfigs';
import type { AnalysisInput } from '../types/analysis';

export type { AnalysisStatus } from '@baturkacamak/extension-ai-react';
export type CardState = AnalysisState<string>;

export interface UseAnalysisManagerReturn {
  cardStates: Record<CardId, CardState>;
  isAnalyzing: boolean;
  completedCount: number;
  canAnalyze: boolean;
  analyzeCard: (cardId: CardId, input: AnalysisInput) => Promise<void>;
  analyzeAll: (input: AnalysisInput) => Promise<void>;
  clearCard: (cardId: CardId) => void;
  clearAll: () => void;
  cancelAll: () => void;
  toggleCardExpanded: (cardId: CardId) => void;
  setCardExpanded: (cardId: CardId, expanded: boolean) => void;
}

export const useAnalysisManager = (): UseAnalysisManagerReturn => {
  const configuredMarker = useSelector(selectGeminiApiKey);
  const { status: localStatus } = useLocalIntelligence();
  const canAnalyze = localStatus === 'ready' || Boolean(configuredMarker);
  const tasks = useMemo(
    () =>
      CARD_CONFIGS.map((config) => ({
        id: config.id,
        analyze: (input: AnalysisInput, signal: AbortSignal) => config.analyzer(input, signal),
      })),
    []
  );
  const manager = useReusableAnalysisManager<AnalysisInput, CardId>({
    tasks,
    enabled: canAnalyze,
  });

  return {
    cardStates: manager.states,
    isAnalyzing: manager.isAnalyzing,
    completedCount: manager.completedCount,
    canAnalyze,
    analyzeCard: manager.analyze,
    analyzeAll: manager.analyzeAll,
    clearCard: manager.clear,
    clearAll: manager.clearAll,
    cancelAll: manager.cancelAll,
    toggleCardExpanded: manager.toggleExpanded,
    setCardExpanded: manager.setExpanded,
  };
};
