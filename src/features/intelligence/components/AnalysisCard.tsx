import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Comment } from '../../../types/commentTypes';
import { useLocalIntelligence } from '../hooks/useLocalIntelligence';
import { KeyIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import Input from '../../shared/components/Input';
import Collapsible from '../../shared/components/Collapsible';
import { motion } from 'framer-motion';

interface AnalysisCardProps {
  title: string;
  icon: React.ReactNode;
  comments: Comment[];
  analyzer: (comments: Comment[], apiKey?: string) => Promise<string>;
  renderResult?: (data: string) => React.ReactNode;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({
  title,
  icon,
  comments,
  analyzer,
  renderResult,
}) => {
  const { t } = useTranslation();
  const { status } = useLocalIntelligence();
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [apiKey, setApiKey] = useState('');
  const [showApiInput, setShowApiInput] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    try {
      const effectiveKey = status === 'ready' ? undefined : apiKey;

      if (status !== 'ready' && !apiKey) {
        setError('Please provide an API key or enable Chrome Built-in AI.');
        setLoading(false);
        return;
      }

      const data = await analyzer(comments, effectiveKey);
      setResult(data);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Analysis failed.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-100 dark:border-gray-700 h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-semibold flex items-center gap-2 dark:text-white">
          {icon}
          {t(title)}
        </h3>
        {status === 'ready' && (
          <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full dark:bg-green-900 dark:text-green-300">
            Nano
          </span>
        )}
      </div>

      {!result && !loading && (
        <div className="flex-1 flex flex-col justify-center items-center py-6 text-center">
          {status !== 'ready' && status !== 'checking' && (
            <div className="text-xs text-gray-500 mb-4 px-4">
              <p className="mb-2">Chrome AI not detected.</p>
              <button
                onClick={() => setShowApiInput(!showApiInput)}
                className="text-teal-600 hover:underline inline-flex items-center gap-1 dark:text-teal-400"
              >
                <KeyIcon className="w-3 h-3" /> {showApiInput ? 'Hide Key' : 'Use API Key'}
              </button>
              <Collapsible isOpen={showApiInput}>
                <Input
                  type="password"
                  placeholder="Gemini API Key"
                  className="mt-2 w-full p-1.5 text-xs border dark:border-gray-600 dark:text-white dark:bg-gray-700 rounded"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  autoComplete="off"
                />
              </Collapsible>
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={comments.length === 0}
            className="btn-secondary text-sm px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 transition-colors"
          >
            {t('Analyze')}
          </button>
        </div>
      )}

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-gray-400 animate-pulse">
          <ArrowPathIcon className="w-6 h-6 animate-spin mb-2" />
          <span className="text-xs">Processing...</span>
        </div>
      )}

      {error && (
        <div className="text-red-500 text-xs p-2 bg-red-50 dark:bg-red-900/20 rounded">{error}</div>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-gray-700 dark:text-gray-300 overflow-y-auto max-h-[300px] scrollbar-thin"
        >
          {renderResult ? (
            renderResult(result)
          ) : (
            <div className="whitespace-pre-wrap">{result}</div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default AnalysisCard;
