import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCommentSource, setHasYouTubeDataApiKey } from '../../../store/store';
import { selectCommentSource, selectHasYouTubeDataApiKey } from '../../../store/selectors';
import Input from '../../shared/components/Input';
import Button from '../../shared/components/Button';
import SelectBox from '../../shared/components/SelectBox/SelectBox';
import { KeyIcon } from '@heroicons/react/24/outline';
import ExternalLink from '../../shared/components/ExternalLink';
import { Option } from '../../../types/utilityTypes';

const sourceOptions: Option[] = [
  { value: 'auto', label: 'Automatic (recommended)' },
  { value: 'innertube', label: 'YouTube direct' },
  { value: 'dataApi', label: 'YouTube Data API' },
];

const YouTubeDataApiSetting: React.FC = () => {
  const dispatch = useDispatch();
  const source = useSelector(selectCommentSource);
  const configured = useSelector(selectHasYouTubeDataApiKey);
  const [key, setKey] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'YCN_YT_API_STATUS' }, (result) => {
      if (chrome.runtime.lastError) return;
      dispatch(setHasYouTubeDataApiKey(Boolean(result?.configured)));
    });
  }, [dispatch]);

  const save = () =>
    chrome.runtime.sendMessage({ type: 'YCN_YT_API_KEY_SET', key }, (result) => {
      if (chrome.runtime.lastError) return setStatus('Could not save the API key.');
      dispatch(setHasYouTubeDataApiKey(Boolean(result?.configured)));
      setKey('');
      setStatus(result?.configured ? 'API key saved in extension storage.' : 'API key removed.');
    });
  const testKey = () =>
    chrome.runtime.sendMessage({ type: 'YCN_YT_API_TEST', key }, (result) =>
      setStatus(result?.ok ? 'API key works.' : result?.error || 'API key test failed.')
    );

  return (
    <div className="flex flex-col gap-2 w-full" data-testid="youtube-data-api-setting">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Comment source</p>
      <SelectBox
        options={sourceOptions}
        selectedOption={sourceOptions.find((option) => option.value === source) || sourceOptions[0]}
        setSelectedOption={(option) =>
          dispatch(setCommentSource(option.value as 'auto' | 'innertube' | 'dataApi'))
        }
        buttonClassName="text-xs"
        containerClassName="w-full"
        testId="comment-source-select"
      />
      {source === 'dataApi' && (
        <>
          <Input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={configured ? 'Replace or remove API key' : 'YouTube Data API key'}
            className="w-full pr-8 text-xs dark:bg-gray-600 dark:text-white dark:border-gray-500"
            autoComplete="off"
          />
          <div className="flex gap-2 items-center">
            <Button
              onClick={save}
              icon={KeyIcon}
              label="Save key"
              className="text-xs bg-teal-600 text-white hover:bg-teal-700 py-1 px-2"
            />
            <Button
              onClick={testKey}
              icon={KeyIcon}
              label="Test key"
              className="text-xs bg-slate-600 text-white hover:bg-slate-700 py-1 px-2"
            />
            <span className="text-xs text-gray-500">
              {configured ? 'Configured' : 'Not configured'}
            </span>
          </div>
          {status && <p className="text-xs text-gray-500">{status}</p>}
          <p className="text-xs text-gray-500">
            <ExternalLink
              className="text-teal-600 hover:underline"
              href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
            >
              Enable API
            </ExternalLink>
            {' · '}
            <ExternalLink
              className="text-teal-600 hover:underline"
              href="https://console.cloud.google.com/apis/credentials"
            >
              Create key
            </ExternalLink>
            {' · '}
            <ExternalLink
              className="text-teal-600 hover:underline"
              href="https://developers.google.com/youtube/v3/getting-started"
            >
              Guide & quota
            </ExternalLink>
          </p>
        </>
      )}
    </div>
  );
};
export default YouTubeDataApiSetting;
