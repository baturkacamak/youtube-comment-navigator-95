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
  const [isRefreshingTopic, setIsRefreshingTopic] = useState(false);
  const [isManualCloudEnabled, setIsManualCloudEnabled] = useState(false);

  const isSmallDataset = comments.length < 1000;
  const shouldShowCloud = isSmallDataset || isManualCloudEnabled;

  const wordFreqData = useMemo(() => {
    if (!shouldShowCloud) return [];
    return calculateWordFrequency(comments);
  }, [comments, topicCloudRefreshKey, shouldShowCloud]);

  const handleRefreshTopic = () => {
    setIsRefreshingTopic(true);
    setTimeout(() => {
      setTopicCloudRefreshKey((k) => k + 1);
      setIsRefreshingTopic(false);
    }, 800);
  };

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
          {shouldShowCloud && (
            <button
              onClick={handleRefreshTopic}
              disabled={isRefreshingTopic}
              className={`p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${
                isRefreshingTopic ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
              title={t('Refresh Topic Cloud')}
            >
              <ArrowPathIcon className={`w-4 h-4 ${isRefreshingTopic ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {shouldShowCloud ? (
          <WordCloud data={wordFreqData} onWordClick={handleWordClick} />
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
            <TagIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm max-w-xs">
              {t('Large dataset detected ({{count}} comments). Click to generate.', {
                count: comments.length,
              })}
            </p>
            <button
              onClick={() => setIsManualCloudEnabled(true)}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
            >
              {t('Generate Topic Cloud')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntelligenceTab;
