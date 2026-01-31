import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon,
  PlayIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';
import Collapsible from '../../shared/components/Collapsible';
import Tooltip from '../../shared/components/Tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalysisStatus } from '../hooks/useAnalysisManager';
import { useLocalIntelligence } from '../hooks/useLocalIntelligence';

interface AnalysisCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  accentColorClass: string;
  status: AnalysisStatus;
  result: string | null;
  error: string | null;
  isExpanded: boolean;
  canAnalyze: boolean;
  onAnalyze: () => void;
  onClear: () => void;
  onToggleExpanded: () => void;
  renderResult?: (data: string) => React.ReactNode;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({
  title,
  description,
  icon,
  accentColorClass,
  status,
  result,
  error,
  isExpanded,
  canAnalyze,
  onAnalyze,
  onClear,
  onToggleExpanded,
  renderResult,
}) => {
  const { t } = useTranslation();
  const { status: nanoStatus } = useLocalIntelligence();
  const isNanoReady = nanoStatus === 'ready';

  const isIdle = status === 'idle';
  const isLoading = status === 'loading';
  const hasResult = status === 'success' && result;
  const hasError = status === 'error';

  return (
    <div
      className={`flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700 border-l-4 ${accentColorClass} overflow-hidden transition-all duration-300`}
    >
      {/* Header - Always visible */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0">{icon}</div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold dark:text-white truncate">{t(title)}</h3>
              {isNanoReady && (
                <span className="flex-shrink-0 text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full dark:bg-green-900 dark:text-green-300">
                  Nano
                </span>
              )}
            </div>
            {isIdle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                {t(description)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Info tooltip */}
          <Tooltip text={t(description)} position="left">
            <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <InformationCircleIcon className="w-4 h-4" />
            </button>
          </Tooltip>

          {/* Action buttons based on state */}
          {isIdle && (
            <button
              onClick={onAnalyze}
              disabled={!canAnalyze}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-600 dark:disabled:text-gray-400 rounded-md transition-colors"
            >
              <PlayIcon className="w-3.5 h-3.5" />
              {t('Analyze')}
            </button>
          )}

          {isLoading && (
            <button
              onClick={onClear}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-300 dark:bg-red-900/50 dark:hover:bg-red-900/70 rounded-md transition-colors"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              {t('Cancel')}
            </button>
          )}

          {(hasResult || hasError) && (
            <>
              <button
                onClick={onToggleExpanded}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                aria-label={isExpanded ? t('Collapse') : t('Expand')}
              >
                {isExpanded ? (
                  <ChevronUpIcon className="w-4 h-4" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={onClear}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title={t('Clear and rerun')}
              >
                <ArrowPathIcon className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Loading state */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-4"
          >
            <div className="flex flex-col gap-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-3/4 animate-pulse" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-1/2 animate-pulse" />
            </div>
            <div className="flex items-center gap-2 mt-3 text-gray-400 text-xs">
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              <span>{t('Processing...')}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      <AnimatePresence>
        {hasError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Collapsible isOpen={isExpanded}>
              <div className="px-4 pb-4">
                <div className="text-red-500 text-xs p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                  {error}
                </div>
              </div>
            </Collapsible>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result state */}
      <AnimatePresence>
        {hasResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Collapsible isOpen={isExpanded}>
              <div className="px-4 pb-4">
                <div className="text-sm text-gray-700 dark:text-gray-300 overflow-y-auto max-h-[300px] scrollbar-thin">
                  {renderResult ? (
                    renderResult(result)
                  ) : (
                    <div className="whitespace-pre-wrap">{result}</div>
                  )}
                </div>
              </div>
            </Collapsible>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnalysisCard;
