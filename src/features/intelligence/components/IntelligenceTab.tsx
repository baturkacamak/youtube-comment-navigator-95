import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import AnalysisCard from './AnalysisCard';
import AIConfigBanner from './AIConfigBanner';
import AnalysisActionBar from './AnalysisActionBar';
import { Comment } from '../../../types/commentTypes';
import { CARD_CONFIGS } from '../constants/cardConfigs';
import { useAnalysisManager } from '../hooks/useAnalysisManager';
import { getRendererByType } from '../utils/renderHelpers';
import AIConfigurationPanel from './AIConfigurationPanel';
import type { TranscriptEntry } from '../../transcripts/utils/processTranscriptData';
import { selectAIAnalysisSource } from '../../../store/selectors';
import { hasContentForAnalysisSource } from '../services/analysisSourceMaterial';

interface IntelligenceTabProps {
  comments: Comment[];
  transcripts: TranscriptEntry[];
}

const IntelligenceTab: React.FC<IntelligenceTabProps> = ({ comments, transcripts }) => {
  const [isConfigurationOpen, setIsConfigurationOpen] = useState(false);
  const analysisSource = useSelector(selectAIAnalysisSource);
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
  const previousAnalysisSource = useRef(analysisSource);

  useEffect(() => {
    if (previousAnalysisSource.current !== analysisSource) {
      clearAll();
      previousAnalysisSource.current = analysisSource;
    }
  }, [analysisSource, clearAll]);

  const analysisInput = React.useMemo(
    () => ({ comments, transcripts, source: analysisSource }),
    [analysisSource, comments, transcripts]
  );
  const handleAnalyzeAll = useCallback(() => {
    analyzeAll(analysisInput);
  }, [analysisInput, analyzeAll]);

  const hasAnalysisContent = hasContentForAnalysisSource(analysisSource, comments, transcripts);

  return (
    <div className="flex flex-col gap-4 p-1">
      {/* AI Configuration Banner */}
      <AIConfigBanner onConfigure={() => setIsConfigurationOpen(true)} />

      <AIConfigurationPanel
        isOpen={isConfigurationOpen}
        onToggle={() => setIsConfigurationOpen((current) => !current)}
      />

      {/* Action Bar */}
      <AnalysisActionBar
        completedCount={completedCount}
        totalCount={CARD_CONFIGS.length}
        isAnalyzing={isAnalyzing}
        canAnalyze={canAnalyze && hasAnalysisContent}
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
              canAnalyze={canAnalyze && hasAnalysisContent}
              onAnalyze={() => analyzeCard(config.id, analysisInput)}
              onClear={() => clearCard(config.id)}
              onToggleExpanded={() => toggleCardExpanded(config.id)}
              renderResult={renderer}
            />
          );
        })}
      </div>
    </div>
  );
};

export default IntelligenceTab;
