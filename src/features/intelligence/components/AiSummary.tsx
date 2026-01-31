import React, { useState } from 'react';
import { summarizeComments } from '../services/aiService';
import { Comment } from '../../../types/commentTypes';
import { useLocalIntelligence } from '../hooks/useLocalIntelligence';
import { SparklesIcon, KeyIcon } from '@heroicons/react/24/solid';
import Input from '../../shared/components/Input';

interface AiSummaryProps {
  comments: Comment[];
}

const AiSummary: React.FC<AiSummaryProps> = ({ comments }) => {
  const { status } = useLocalIntelligence();
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [apiKey, setApiKey] = useState('');
  const [showApiInput, setShowApiInput] = useState(false);

  const handleSummarize = async () => {
    setLoading(true);
    setError('');
    try {
      // Use local AI if ready, otherwise fallback to API key if provided
      const effectiveKey = status === 'ready' ? undefined : apiKey;

      if (status !== 'ready' && !apiKey) {
        setError('Please provide an API key or enable Chrome Built-in AI.');
        setLoading(false);
        return;
      }

      const result = await summarizeComments(comments, effectiveKey);
      setSummary(result);
    } catch (e: any) {
      setError(e.message || 'Failed to generate summary.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2 dark:text-white">
          <SparklesIcon className="w-5 h-5 text-yellow-500" />
          AI Summary
        </h3>
        {status === 'ready' && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full dark:bg-green-900 dark:text-green-300">
            On-Device AI Ready
          </span>
        )}
      </div>

      {status !== 'ready' && status !== 'checking' && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-2">
            Chrome AI not detected. Enable{' '}
            <code>chrome://flags/#optimization-guide-on-device-model</code> or use an API Key.
          </p>
          <button
            onClick={() => setShowApiInput(!showApiInput)}
            className="text-teal-600 hover:underline flex items-center gap-1 dark:text-teal-400"
          >
            <KeyIcon className="w-4 h-4" /> {showApiInput ? 'Hide API Key' : 'Enter API Key'}
          </button>

          {showApiInput && (
            <Input
              type="password"
              placeholder="Gemini API Key"
              className="mt-2 w-full p-2 border dark:border-gray-600 dark:text-white"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
          )}
        </div>
      )}

      {summary && (
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 prose dark:prose-invert text-sm max-w-none text-gray-800 dark:text-gray-200">
          {summary}
        </div>
      )}

      {error && <div className="text-red-500 text-sm">{error}</div>}

      <button
        onClick={handleSummarize}
        disabled={loading || comments.length === 0}
        className="btn-primary w-full flex justify-center items-center gap-2 py-2 rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Summarizing...' : 'Summarize Comments'}
      </button>
    </div>
  );
};

export default AiSummary;
