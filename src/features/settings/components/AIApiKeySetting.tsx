import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { KeyIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { setGeminiApiKey } from '../../../store/store';
import { selectGeminiApiKey } from '../../../store/selectors';
import Input from '../../shared/components/Input';
import ExternalLink from '../../shared/components/ExternalLink';
import { setRemoteAIApiKey } from '../../intelligence/services/aiService';

const AIApiKeySetting: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const apiKey = useSelector(selectGeminiApiKey);
  const [showKey, setShowKey] = useState(false);
  const [localKey, setLocalKey] = useState('');

  const handleSave = async () => {
    if (!localKey.trim()) return;
    const value = await setRemoteAIApiKey(localKey);
    dispatch(setGeminiApiKey(value.configured ? 'configured' : ''));
    setLocalKey('');
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalKey(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      void handleSave();
    }
  };

  const hasUnsavedChanges = Boolean(localKey);
  const isConfigured = apiKey && apiKey.length > 0;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
          <KeyIcon className="w-4 h-4" />
          {t('Gemini API Key')}
        </label>
        {isConfigured && (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <CheckCircleIcon className="w-3 h-3" />
            {t('Configured')}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <div className="relative h-10 flex-1">
          <Input
            type={showKey ? 'text' : 'password'}
            placeholder={t('Enter your Gemini API key')}
            className="h-10 w-full !rounded-lg !bg-teal-200 !py-2 !pl-4 !pr-10 text-sm font-medium text-gray-800 shadow-sm placeholder:text-gray-500 hover:!bg-gray-100 focus:!ring-blue-600 dark:!bg-gray-700 dark:text-gray-200 dark:placeholder:text-gray-400 dark:hover:!bg-gray-600 dark:focus:!ring-blue-600"
            value={localKey}
            onChange={handleKeyChange}
            onKeyDown={handleKeyDown}
            onBlur={() => void handleSave()}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label={showKey ? t('Hide API key') : t('Show API key')}
          >
            {showKey ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
          </button>
        </div>
        {hasUnsavedChanges && (
          <button
            onClick={() => void handleSave()}
            className="h-10 rounded-lg bg-teal-600 px-4 text-sm font-medium text-white transition-colors hover:bg-teal-700"
          >
            {t('Save')}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t('Used for AI analysis when Chrome AI is unavailable.')}{' '}
        <ExternalLink
          href="https://aistudio.google.com/app/apikey"
          className="text-teal-600 hover:underline dark:text-teal-400"
        >
          {t('Get API key')}
        </ExternalLink>
      </p>
    </div>
  );
};

export default AIApiKeySetting;
