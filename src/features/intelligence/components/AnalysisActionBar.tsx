import React from 'react';
import { useTranslation } from 'react-i18next';
import { PlayIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

interface AnalysisActionBarProps {
  completedCount: number;
  totalCount: number;
  isAnalyzing: boolean;
  canAnalyze: boolean;
  onAnalyzeAll: () => void;
  onClearAll: () => void;
  onCancelAll?: () => void;
}

const AnalysisActionBar: React.FC<AnalysisActionBarProps> = ({
  completedCount,
  totalCount,
  isAnalyzing,
  canAnalyze,
  onAnalyzeAll,
  onClearAll,
  onCancelAll,
}) => {
  const { t } = useTranslation();

  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const hasResults = completedCount > 0;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
      <div className="flex items-center gap-2">
        {isAnalyzing ? (
          <button
            onClick={onCancelAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-300 dark:bg-red-900/50 dark:hover:bg-red-900/70 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
            {t('Cancel')}
          </button>
        ) : (
          <button
            onClick={onAnalyzeAll}
            disabled={!canAnalyze}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-600 dark:disabled:text-gray-400 rounded-lg transition-colors"
          >
            <PlayIcon className="w-4 h-4" />
            {t('Analyze All')}
          </button>
        )}

        {hasResults && !isAnalyzing && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-lg transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            {t('Clear All')}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isAnalyzing && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin" />
            <span className="text-sm text-gray-600 dark:text-gray-300">{t('Analyzing...')}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 min-w-[4rem] text-right">
            {completedCount}/{totalCount}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AnalysisActionBar;
