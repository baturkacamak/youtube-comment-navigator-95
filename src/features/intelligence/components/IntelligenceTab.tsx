import React, { useMemo, useCallback, useState } from 'react';
import WordCloud from './WordCloud';
import AnalysisCard from './AnalysisCard';
import AIConfigBanner from './AIConfigBanner';
import AnalysisActionBar from './AnalysisActionBar';
import { calculateWordFrequency } from '../services/wordFrequencyService';
import { useTranslation } from 'react-i18next';
import { Comment } from '../../../types/commentTypes';
import { useDispatch } from 'react-redux';
import { setSearchKeyword } from '../../../store/store';
import { TagIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
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

  const [topicCloudRefreshKey, setTopicCloudRefreshKey] = useState(0);

  const wordFreqData = useMemo(
    () => calculateWordFrequency(comments),
    [comments, topicCloudRefreshKey]
  );

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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 dark:text-white">
            <TagIcon className="w-5 h-5 text-indigo-500" />
            {t('Topic Cloud')}
          </h3>
          <button
            onClick={() => setTopicCloudRefreshKey((k) => k + 1)}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            title={t('Refresh Topic Cloud')}
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
        <WordCloud data={wordFreqData} onWordClick={handleWordClick} />
      </div>
    </div>
  );
};

export default IntelligenceTab;
