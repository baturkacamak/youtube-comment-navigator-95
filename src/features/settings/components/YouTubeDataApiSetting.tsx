import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { setCommentSource, setHasYouTubeDataApiKey } from '../../../store/store';
import { selectCommentSource, selectHasYouTubeDataApiKey } from '../../../store/selectors';
import Input from '../../shared/components/Input';
import SelectBox from '../../shared/components/SelectBox/SelectBox';
import {
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import ExternalLink from '../../shared/components/ExternalLink';
import { getCommentSourceOptions, resolveSelectableCommentSource } from './commentSourceOptions';

const YouTubeDataApiSetting: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const source = useSelector(selectCommentSource);
  const configured = useSelector(selectHasYouTubeDataApiKey);
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState('');
  const [keyStatusLoaded, setKeyStatusLoaded] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'YCN_YT_API_STATUS' }, (result) => {
      if (chrome.runtime.lastError) return;
      const hasKey = Boolean(result?.configured);
      dispatch(setHasYouTubeDataApiKey(hasKey));
      setKeyStatusLoaded(true);
      if (resolveSelectableCommentSource(source, hasKey) !== source) {
        dispatch(setCommentSource('auto'));
      }
    });
  }, [dispatch, source]);

  const save = () => {
    if (!key.trim() && !configured) {
      return;
    }

    chrome.runtime.sendMessage({ type: 'YCN_YT_API_KEY_SET', key }, (result) => {
      if (chrome.runtime.lastError) return setStatus(t('Could not save the API key.'));
      const hasKey = Boolean(result?.configured);
      dispatch(setHasYouTubeDataApiKey(hasKey));
      setKeyStatusLoaded(true);
      if (resolveSelectableCommentSource(source, hasKey) !== source) {
        dispatch(setCommentSource('auto'));
      }
      setKey('');
      setStatus(
        result?.configured ? t('API key saved in extension storage.') : t('API key removed.')
      );
    });
  };
  const testKey = () =>
    chrome.runtime.sendMessage({ type: 'YCN_YT_API_TEST', key }, (result) =>
      setStatus(result?.ok ? t('API key works.') : result?.error || t('API key test failed.'))
    );
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      save();
    }
  };
  const hasUnsavedChanges = Boolean(key.trim());
  const canUseDataApi = keyStatusLoaded ? configured : source === 'dataApi';
  const sourceOptions = getCommentSourceOptions(t, canUseDataApi);
  const selectedSource = resolveSelectableCommentSource(source, canUseDataApi);

  return (
    <div className="flex flex-col gap-2 w-full" data-testid="youtube-data-api-setting">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('Comment source')}</p>
      <SelectBox
        options={sourceOptions}
        selectedOption={
          sourceOptions.find((option) => option.value === selectedSource) || sourceOptions[0]
        }
        setSelectedOption={(option) =>
          dispatch(setCommentSource(option.value as 'auto' | 'innertube' | 'dataApi'))
        }
        buttonClassName="text-xs"
        containerClassName="w-full"
        testId="comment-source-select"
      />
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="ycn-data-api-key-input"
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            {t('YouTube Data API key')}
          </label>
          {configured && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircleIcon className="w-3 h-3" />
              {t('Configured')}
            </span>
          )}
          {!configured && (
            <span className="text-[10px] leading-none text-gray-500 dark:text-gray-400">
              {t('Not configured')}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <div className="relative h-10 flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 mt-[-4px] flex items-center text-gray-500 dark:text-gray-400">
              <KeyIcon className="h-4 w-4" />
            </span>
            <Input
              type={showKey ? 'text' : 'password'}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={save}
              placeholder={t('Enter your YouTube Data API key')}
              className="h-10 w-full !rounded-lg !bg-teal-200 !py-2 !pl-10 !pr-10 text-sm font-medium text-gray-800 shadow-sm placeholder:text-gray-500 hover:!bg-gray-100 focus:!ring-blue-600 dark:!bg-gray-700 dark:text-gray-200 dark:placeholder:text-gray-400 dark:hover:!bg-gray-600 dark:focus:!ring-blue-600"
              autoComplete="new-password"
              id="ycn-data-api-key-input"
              name="ycn-data-key-input"
              data-lpignore="true"
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
              type="button"
              onClick={save}
              className="h-10 rounded-lg bg-teal-600 px-4 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              {t('Save')}
            </button>
          )}
          {hasUnsavedChanges && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={testKey}
              className="flex h-10 items-center gap-2 rounded-lg bg-slate-600 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-700"
            >
              <WrenchScrewdriverIcon className="w-4 h-4" />
              {t('Test')}
            </button>
          )}
        </div>
        {status && <p className="text-xs text-gray-500 dark:text-gray-400">{status}</p>}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <ExternalLink
            className="text-teal-600 hover:underline dark:text-teal-400"
            href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
          >
            {t('Enable API')}
          </ExternalLink>
          {' · '}
          <ExternalLink
            className="text-teal-600 hover:underline dark:text-teal-400"
            href="https://console.cloud.google.com/apis/credentials"
          >
            {t('Create key')}
          </ExternalLink>
          {' · '}
          <ExternalLink
            className="text-teal-600 hover:underline dark:text-teal-400"
            href="https://developers.google.com/youtube/v3/getting-started"
          >
            {t('Guide & quota')}
          </ExternalLink>
        </p>
      </div>
    </div>
  );
};
export default YouTubeDataApiSetting;
