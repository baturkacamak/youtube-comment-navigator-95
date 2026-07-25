import React, { useCallback, useEffect, useState } from 'react';
import { ArrowPathIcon, BellAlertIcon, BellSlashIcon } from '@heroicons/react/24/outline';
import Button from '../../shared/components/Button';

interface MonitorStatusResponse {
  monitored: boolean;
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

const formatLastChecked = (timestamp: number | null): string => {
  if (!timestamp) {
    return 'Waiting for first check.';
  }

  return `Last checked at ${new Date(timestamp).toLocaleString()}`;
};

const formatNextCheck = (timestamp: number | null): string => {
  if (!timestamp) {
    return 'Next check will be scheduled after the first run.';
  }

  return `Next check around ${new Date(timestamp).toLocaleString()}`;
};

const VideoCommentMonitorControl: React.FC<{ videoId: string | null }> = ({ videoId }) => {
  const [status, setStatus] = useState<MonitorStatusResponse>({
    monitored: false,
    lastCheckedAt: null,
    nextCheckAt: null,
    intervalMinutes: null,
    lastKnownCount: 0,
    lastKnownTotalCommentCount: null,
    lastError: null,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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
    void refreshStatus().catch((error) => {
      setMessage(error instanceof Error ? error.message : 'Could not load monitor status.');
    });
  }, [refreshStatus]);

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
          ? 'Monitoring enabled. Existing comments were saved as the starting point.'
          : nextStatus.lastError || 'Could not enable monitoring.'
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not enable monitoring.');
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
      setMessage('Monitoring stopped for this video.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not disable monitoring.');
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
        lastCheckedAt: result.lastCheckedAt,
        nextCheckAt: result.nextCheckAt,
        intervalMinutes: result.intervalMinutes,
        lastKnownCount: result.lastKnownCount,
        lastKnownTotalCommentCount: result.lastKnownTotalCommentCount,
        lastError: result.error || null,
      });

      if (!result.ok) {
        setMessage(result.error || 'Background check failed.');
      } else if (result.skipped) {
        setMessage('No comment count change. Skipped the full comment fetch to save quota.');
      } else if (result.newCount > 0) {
        setMessage(
          result.newCount === 1 ? 'Found 1 new comment.' : `Found ${result.newCount} new comments.`
        );
      } else {
        setMessage('No new comments found.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not run background check.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/70 p-3 dark:border-teal-900 dark:bg-teal-950/30">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Background comment alerts
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Checks this video on an adaptive schedule with the YouTube Data API while your browser
            stays open.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Requires a configured YouTube Data API key for background monitoring.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {formatLastChecked(status.lastCheckedAt)}
          </p>
          {status.monitored && (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatNextCheck(status.nextCheckAt)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Interval: {status.intervalMinutes ?? '?'} min · latest tracked window:{' '}
                {status.lastKnownCount}
                {status.lastKnownTotalCommentCount !== null
                  ? ` · total comments: ${status.lastKnownTotalCommentCount}`
                  : ''}
              </p>
            </>
          )}
          {status.lastError && (
            <p className="text-xs text-rose-600 dark:text-rose-300">{status.lastError}</p>
          )}
          {message && <p className="text-xs text-teal-700 dark:text-teal-300">{message}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {status.monitored ? (
            <>
              <Button
                onClick={handleDisable}
                icon={BellSlashIcon}
                label={loading ? 'Processing...' : 'Stop following this video'}
                className="bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-800"
                disabled={loading}
              />
              <Button
                onClick={handleCheckNow}
                icon={ArrowPathIcon}
                label={loading ? 'Processing...' : 'Check now'}
                className="bg-teal-600 px-3 py-2 text-xs text-white hover:bg-teal-700"
                disabled={loading}
              />
            </>
          ) : (
            <Button
              onClick={handleEnable}
              icon={BellAlertIcon}
              label={loading ? 'Processing...' : 'Follow this video'}
              className="bg-teal-600 px-3 py-2 text-xs text-white hover:bg-teal-700"
              disabled={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCommentMonitorControl;
