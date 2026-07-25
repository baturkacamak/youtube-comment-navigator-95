import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowPathIcon,
  BellAlertIcon,
  BellIcon,
  BellSlashIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  ExclamationCircleIcon,
  RectangleStackIcon,
} from '@heroicons/react/24/outline';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import Button from '../../shared/components/Button';
import { YOUTUBE_DATA_API_KEY_STORAGE } from '../../shared/services/youtubeDataApi';

interface MonitorStatusResponse {
  monitored: boolean;
  apiKeyConfigured: boolean;
  lastCheckedAt: number | null;
  nextCheckAt: number | null;
  intervalMinutes: number | null;
  lastKnownCount: number;
  lastKnownTotalCommentCount: number | null;
  lastError: string | null;
}

interface CheckNowResponse extends MonitorStatusResponse {
  ok: boolean;
  newCount: number;
  skipped?: boolean;
  error?: string;
}

const sendRuntimeMessage = <T,>(message: Record<string, unknown>): Promise<T> =>
  new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: T) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });

const formatLastChecked = (timestamp: number | null, t: TFunction): string => {
  if (!timestamp) {
    return t('Waiting for first check.');
  }

  return t('Last checked at {{date}}', { date: new Date(timestamp).toLocaleString() });
};

const formatNextCheck = (timestamp: number | null, t: TFunction): string => {
  if (!timestamp) {
    return t('Next check will be scheduled after the first run.');
  }

  return t('Next check around {{date}}', { date: new Date(timestamp).toLocaleString() });
};

const formatMonitorMessage = (message: string | null | undefined, t: TFunction): string | null => {
  if (!message) {
    return null;
  }

  if (message.includes('YouTube Data API key')) {
    return t('Add a YouTube Data API key in Settings to follow videos.');
  }

  return message;
};

const VideoCommentMonitorControl: React.FC<{ videoId: string | null }> = ({ videoId }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<MonitorStatusResponse>({
    monitored: false,
    apiKeyConfigured: false,
    lastCheckedAt: null,
    nextCheckAt: null,
    intervalMinutes: null,
    lastKnownCount: 0,
    lastKnownTotalCommentCount: null,
    lastError: null,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (!videoId) {
      return;
    }

    const nextStatus = await sendRuntimeMessage<MonitorStatusResponse>({
      type: 'YCN_COMMENT_MONITOR_STATUS',
      videoId,
    });
    setStatus(nextStatus);
  }, [videoId]);

  useEffect(() => {
    setMessage('');
    setOpen(false);
    void refreshStatus().catch((error) => {
      setMessage(error instanceof Error ? error.message : t('Could not load monitor status.'));
    });
  }, [refreshStatus, t]);

  useEffect(() => {
    const storageChanges = typeof chrome === 'undefined' ? undefined : chrome.storage?.onChanged;
    if (!storageChanges) {
      return;
    }

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== 'local' || !changes[YOUTUBE_DATA_API_KEY_STORAGE]) {
        return;
      }

      setMessage('');
      void refreshStatus().catch((error) => {
        setMessage(error instanceof Error ? error.message : t('Could not load monitor status.'));
      });
    };

    storageChanges.addListener(handleStorageChange);
    return () => storageChanges.removeListener(handleStorageChange);
  }, [refreshStatus, t]);

  if (!videoId) {
    return null;
  }

  const handleEnable = async () => {
    setLoading(true);
    try {
      const nextStatus = await sendRuntimeMessage<MonitorStatusResponse>({
        type: 'YCN_COMMENT_MONITOR_ENABLE',
        videoId,
      });
      setStatus(nextStatus);
      setMessage(
        nextStatus.monitored
          ? t('Monitoring enabled. Existing comments were saved as the starting point.')
          : formatMonitorMessage(nextStatus.lastError, t) || t('Could not enable monitoring.')
      );
    } catch (error) {
      setMessage(
        formatMonitorMessage(error instanceof Error ? error.message : null, t) ||
          t('Could not enable monitoring.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      const nextStatus = await sendRuntimeMessage<MonitorStatusResponse>({
        type: 'YCN_COMMENT_MONITOR_DISABLE',
        videoId,
      });
      setStatus(nextStatus);
      setMessage(t('Monitoring stopped for this video.'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('Could not disable monitoring.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckNow = async () => {
    setLoading(true);
    try {
      const result = await sendRuntimeMessage<CheckNowResponse>({
        type: 'YCN_COMMENT_MONITOR_CHECK_NOW',
        videoId,
      });

      setStatus({
        monitored: result.monitored,
        apiKeyConfigured: result.apiKeyConfigured,
        lastCheckedAt: result.lastCheckedAt,
        nextCheckAt: result.nextCheckAt,
        intervalMinutes: result.intervalMinutes,
        lastKnownCount: result.lastKnownCount,
        lastKnownTotalCommentCount: result.lastKnownTotalCommentCount,
        lastError: result.error || null,
      });

      if (!result.ok) {
        setMessage(formatMonitorMessage(result.error, t) || t('Background check failed.'));
      } else if (result.skipped) {
        setMessage(t('No comment count change. Skipped the full comment fetch to save quota.'));
      } else if (result.newCount > 0) {
        setMessage(
          result.newCount === 1
            ? t('Found 1 new comment.')
            : t('Found {{count}} new comments.', { count: result.newCount })
        );
      } else {
        setMessage(t('No new comments found.'));
      }
    } catch (error) {
      setMessage(
        formatMonitorMessage(error instanceof Error ? error.message : null, t) ||
          t('Could not run background check.')
      );
    } finally {
      setLoading(false);
    }
  };

  const monitoringActive = status.monitored && status.apiKeyConfigured && !status.lastError;
  const monitoringPaused = status.monitored && !status.apiKeyConfigured;
  const BellStatusIcon =
    status.lastError || monitoringPaused
      ? ExclamationCircleIcon
      : status.monitored
        ? BellAlertIcon
        : BellIcon;

  return (
    <div className="relative flex-none p-2">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-teal-500 ${
          monitoringActive
            ? 'border-teal-500 bg-teal-600 text-white hover:bg-teal-700'
            : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
        }`}
        aria-label={t('Background comment alerts')}
        aria-expanded={open}
        title={t('Background comment alerts')}
      >
        <BellStatusIcon className="h-5 w-5" />
        {monitoringActive && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-300 ring-2 ring-teal-700" />
        )}
        {(status.lastError || monitoringPaused) && (
          <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-800" />
        )}
      </button>

      {open && (
        <div className="absolute right-2 top-14 z-30 w-80 rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t('Background comment alerts')}
            </p>
            {monitoringPaused ? (
              <div className="rounded-md border border-amber-300/70 bg-amber-50 px-2.5 py-2 text-xs text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="font-medium">{t('Monitoring is paused')}</p>
                <p>
                  {t(
                    'This video is still followed, but background checks will resume only after you add a YouTube Data API key in Settings.'
                  )}
                </p>
              </div>
            ) : !status.monitored && !status.apiKeyConfigured && !message ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('Add a YouTube Data API key in Settings before following videos.')}
              </p>
            ) : !status.monitored && status.apiKeyConfigured ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('Ready to follow this video. New comment alerts will appear here.')}
              </p>
            ) : null}
            <div className="mt-1 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ClockIcon className="mt-0.5 h-3.5 w-3.5 flex-none text-slate-400 dark:text-slate-500" />
              <span>{formatLastChecked(status.lastCheckedAt, t)}</span>
            </div>
            {status.monitored && status.apiKeyConfigured && (
              <div className="flex flex-col gap-1">
                <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <ArrowPathIcon className="mt-0.5 h-3.5 w-3.5 flex-none text-slate-400 dark:text-slate-500" />
                  <span>{formatNextCheck(status.nextCheckAt, t)}</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <ChartBarIcon className="mt-0.5 h-3.5 w-3.5 flex-none text-slate-400 dark:text-slate-500" />
                  <span>
                    {t('Interval: {{minutes}} min', {
                      minutes: status.intervalMinutes ?? '?',
                    })}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <RectangleStackIcon className="mt-0.5 h-3.5 w-3.5 flex-none text-slate-400 dark:text-slate-500" />
                  <span>{t('Latest window: {{count}}', { count: status.lastKnownCount })}</span>
                </div>
                {status.lastKnownTotalCommentCount !== null && (
                  <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <ChatBubbleLeftRightIcon className="mt-0.5 h-3.5 w-3.5 flex-none text-slate-400 dark:text-slate-500" />
                    <span>
                      {t('Total comments: {{count}}', {
                        count: status.lastKnownTotalCommentCount,
                      })}
                    </span>
                  </div>
                )}
              </div>
            )}
            {status.lastError && !message && !monitoringPaused && (
              <p className="text-xs text-rose-600 dark:text-rose-300">
                {formatMonitorMessage(status.lastError, t)}
              </p>
            )}
            {message && <p className="text-xs text-teal-700 dark:text-teal-300">{message}</p>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {status.monitored ? (
              <>
                <Button
                  onClick={handleDisable}
                  icon={BellSlashIcon}
                  label={loading ? t('Processing...') : t('Stop following this video')}
                  className="bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-800"
                  disabled={loading}
                />
                {status.apiKeyConfigured && (
                  <Button
                    onClick={handleCheckNow}
                    icon={ArrowPathIcon}
                    label={loading ? t('Processing...') : t('Check now')}
                    className="bg-teal-600 px-3 py-2 text-xs text-white hover:bg-teal-700"
                    disabled={loading}
                  />
                )}
              </>
            ) : (
              <Button
                onClick={handleEnable}
                icon={BellAlertIcon}
                label={loading ? t('Processing...') : t('Follow this video')}
                className="bg-teal-600 px-3 py-2 text-xs text-white hover:bg-teal-700"
                disabled={loading}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCommentMonitorControl;
