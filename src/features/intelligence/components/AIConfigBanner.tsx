import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  ExclamationTriangleIcon,
  CpuChipIcon,
  KeyIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { selectGeminiApiKey } from '../../../store/selectors';
import { useLocalIntelligence } from '../hooks/useLocalIntelligence';

interface AIConfigBannerProps {
  onOpenSettings?: () => void;
}

const AIConfigBanner: React.FC<AIConfigBannerProps> = ({ onOpenSettings }) => {
  const { t } = useTranslation();
  const { status } = useLocalIntelligence();
  const apiKey = useSelector(selectGeminiApiKey);

  const isNanoReady = status === 'ready';
  const hasApiKey = apiKey && apiKey.length > 0;

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin" />
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {t('Checking AI availability...')}
        </span>
      </div>
    );
  }

  if (isNanoReady) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-3">
          <CpuChipIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-green-800 dark:text-green-300">
              {t('Chrome AI Ready')}
            </span>
            <span className="text-xs text-green-600 dark:text-green-400">
              {t('Using local Gemini Nano for fast, private analysis')}
            </span>
          </div>
        </div>
        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200 rounded-full">
          Nano
        </span>
      </div>
    );
  }

  if (hasApiKey) {
    const maskedKey = `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`;
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3">
          <KeyIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
              {t('API Key Configured')}
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-mono">{maskedKey}</span>
          </div>
        </div>
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-300 dark:bg-blue-800 dark:hover:bg-blue-700 rounded-md transition-colors"
          >
            <Cog6ToothIcon className="w-3.5 h-3.5" />
            {t('Configure')}
          </button>
        )}
      </div>
    );
  }

  // Not configured state
  return (
    <div className="flex flex-col gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {t('AI Not Configured')}
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400">
              {t('Enable Chrome AI or add an API key to use AI analysis')}
            </span>
          </div>
        </div>
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 dark:text-amber-300 dark:bg-amber-800 dark:hover:bg-amber-700 rounded-md transition-colors shrink-0"
          >
            <Cog6ToothIcon className="w-3.5 h-3.5" />
            {t('Configure')}
          </button>
        )}
      </div>
      <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/30 rounded p-2">
        <p className="font-medium mb-1">{t('Option 1: Enable Chrome Built-in AI (Recommended)')}</p>
        <p className="text-amber-600 dark:text-amber-400 mb-2">
          {t('Visit')}{' '}
          <code className="bg-amber-200 dark:bg-amber-800 px-1 rounded text-[11px]">
            chrome://flags/#optimization-guide-on-device-model
          </code>{' '}
          {t('and enable it, then restart Chrome.')}
        </p>
        <p className="font-medium mb-1">{t('Option 2: Use Gemini API Key')}</p>
        <p className="text-amber-600 dark:text-amber-400">
          {t('Add your API key in Settings.')}{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-amber-800 dark:hover:text-amber-200"
          >
            {t('Get a free API key')}
          </a>
        </p>
      </div>
    </div>
  );
};

export default AIConfigBanner;
