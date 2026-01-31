import React, { useMemo, useCallback } from 'react';
import WordCloud from './WordCloud';
import AnalysisCard from './AnalysisCard';
import AIConfigBanner from './AIConfigBanner';
import AnalysisActionBar from './AnalysisActionBar';
import { calculateWordFrequency } from '../services/wordFrequencyService';
import { useTranslation } from 'react-i18next';
import { Comment } from '../../../types/commentTypes';
import { useDispatch } from 'react-redux';
import { setSearchKeyword } from '../../../store/store';
import { TagIcon } from '@heroicons/react/24/solid';
import { CARD_CONFIGS } from '../constants/cardConfigs';
import { useAnalysisManager } from '../hooks/useAnalysisManager';
import { getRendererByType } from '../utils/renderHelpers';

interface IntelligenceTabProps {
  comments: Comment[];
  onOpenSettings?: () => void;
}

const IntelligenceTab: React.FC<IntelligenceTabProps> = ({ comments, onOpenSettings }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const {
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
  } = useAnalysisManager();

  const wordFreqData = useMemo(() => calculateWordFrequency(comments), [comments]);

  const handleWordClick = useCallback(
    (word: string) => {
      dispatch(setSearchKeyword(word));
    },
    [dispatch]
  );

  const handleAnalyzeAll = useCallback(() => {
    analyzeAll(comments);
  }, [analyzeAll, comments]);

  const hasComments = comments.length > 0;

  return (
    <div className="flex flex-col gap-4 p-1">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold dark:text-white">{t('Intelligence Dashboard')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('AI-powered insights for your community interactions.')}
        </p>
      </div>

      {/* AI Configuration Banner */}
      <AIConfigBanner onOpenSettings={onOpenSettings} />

      {/* Action Bar */}
      <AnalysisActionBar
        completedCount={completedCount}
        totalCount={CARD_CONFIGS.length}
        isAnalyzing={isAnalyzing}
        canAnalyze={canAnalyze && hasComments}
        onAnalyzeAll={handleAnalyzeAll}
        onClearAll={clearAll}
        onCancelAll={cancelAll}
      />

      {/* Analysis Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {CARD_CONFIGS.map((config) => {
          const state = cardStates[config.id];
          const IconComponent = config.icon;
          const renderer = getRendererByType(config.renderType);

          return (
            <AnalysisCard
              key={config.id}
              title={config.title}
              description={config.description}
              icon={<IconComponent className={`w-5 h-5 ${config.iconColorClass}`} />}
              accentColorClass={config.accentColorClass}
              status={state.status}
              result={state.result}
              error={state.error}
              isExpanded={state.isExpanded}
              canAnalyze={canAnalyze && hasComments}
              onAnalyze={() => analyzeCard(config.id, comments)}
              onClear={() => clearCard(config.id)}
              onToggleExpanded={() => toggleCardExpanded(config.id)}
              renderResult={renderer}
            />
          );
        })}
      </div>

      {/* Topic Cloud (Full Width) */}
      <div className="mt-2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-white">
          <TagIcon className="w-5 h-5 text-indigo-500" />
          {t('Topic Cloud')}
        </h3>
        <WordCloud data={wordFreqData} onWordClick={handleWordClick} />
      </div>
    </div>
  );
};

export default IntelligenceTab;
