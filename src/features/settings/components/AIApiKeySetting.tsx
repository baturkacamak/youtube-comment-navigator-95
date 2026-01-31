import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { KeyIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { setGeminiApiKey } from '../../../store/store';
import { selectGeminiApiKey } from '../../../store/selectors';
import Input from '../../shared/components/Input';

const AIApiKeySetting: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const apiKey = useSelector(selectGeminiApiKey);
  const [showKey, setShowKey] = useState(false);
  const [localKey, setLocalKey] = useState(apiKey || '');

  const handleSave = () => {
    dispatch(setGeminiApiKey(localKey));
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalKey(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  const hasUnsavedChanges = localKey !== apiKey;
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
        <div className="relative flex-1">
          <Input
            type={showKey ? 'text' : 'password'}
            placeholder={t('Enter your Gemini API key')}
            className="w-full pr-8 text-xs dark:bg-gray-600 dark:text-white dark:border-gray-500"
            value={localKey}
            onChange={handleKeyChange}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label={showKey ? t('Hide API key') : t('Show API key')}
          >
            {showKey ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
          </button>
        </div>
        {hasUnsavedChanges && (
          <button
            onClick={handleSave}
            className="px-3 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
          >
            {t('Save')}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t('Used for AI analysis when Chrome AI is unavailable.')}{' '}
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-600 hover:underline dark:text-teal-400"
        >
          {t('Get API key')}
        </a>
      </p>
    </div>
  );
};

export default AIApiKeySetting;
