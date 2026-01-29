import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  HandThumbUpIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { setFilters } from '../../../store/store';
import { RootState } from '../../../types/rootState';
import { FilterState } from '../../../types/filterTypes';

/** Debounce delay for filter updates (ms) */
const FILTER_DEBOUNCE_MS = 300;

const AdvancedFilters: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const filters = useSelector((state: RootState) => state.filters);
  const [likesThreshold, setLikesThreshold] = useState<{ min: number; max: number | string }>({
    min: 0,
    max: Infinity,
  });
  const [repliesLimit, setRepliesLimit] = useState<{ min: number; max: number | string }>({
    min: 0,
    max: Infinity,
  });
  const [wordCount, setWordCount] = useState<{ min: number; max: number | string }>({
    min: 0,
    max: Infinity,
  });
  const [dateTimeRange, setDateTimeRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });

  // Refs for debounce timers
  const debounceTimers = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    setDateTimeRange({ start: '', end: '' });
  }, []);

  // PERF: Debounced filter update - prevents excessive Redux dispatches and DB queries
  // Local state updates immediately for responsive UI, Redux updates after debounce
  const updateFilterDebounced = useCallback(
    (key: keyof FilterState, value: any) => {
      // Clear any pending update for this key
      if (debounceTimers.current[key]) {
        clearTimeout(debounceTimers.current[key]);
      }

      // Schedule the Redux dispatch
      debounceTimers.current[key] = setTimeout(() => {
        dispatch(
          setFilters({
            ...filters,
            [key]: value,
          })
        );
      }, FILTER_DEBOUNCE_MS);
    },
    [dispatch, filters]
  );

  const handleLikesThresholdChange = (key: 'min' | 'max', value: number) => {
    const newValue = { ...likesThreshold, [key]: value };
    setLikesThreshold(newValue);
    updateFilterDebounced('likesThreshold', newValue);
  };

  const handleRepliesLimitChange = (key: 'min' | 'max', value: number) => {
    const newValue = { ...repliesLimit, [key]: value };
    setRepliesLimit(newValue);
    updateFilterDebounced('repliesLimit', newValue);
  };

  const handleWordCountChange = (key: 'min' | 'max', value: number) => {
    const newValue = { ...wordCount, [key]: value };
    setWordCount(newValue);
    updateFilterDebounced('wordCount', newValue);
  };

  const handleDateTimeRangeChange = (key: 'start' | 'end', value: string) => {
    const newValue = { ...dateTimeRange, [key]: value };
    setDateTimeRange(newValue);
    updateFilterDebounced('dateTimeRange', newValue);
  };

  return (
    <div className="rounded-lg shadow-lg p-4 bg-white dark:bg-gray-800">
      <div className="mt-4 space-y-4">
        <div className="flex gap-6">
          {/* Likes Filter */}
          <div className="flex flex-col">
            <div className="flex items-center mb-1">
              <HandThumbUpIcon className="w-5 h-5 text-gray-800 dark:text-gray-200 mr-2" />
              <label className="text-gray-800 dark:text-gray-200 ">{t('Likes')}</label>
            </div>
            <div className="flex space-x-2">
              <div className="flex flex-col">
                <input
                  type="number"
                  min="0"
                  max={typeof likesThreshold.max === 'number' ? likesThreshold.max - 1 : undefined}
                  value={likesThreshold.min}
                  onChange={(e) => handleLikesThresholdChange('min', parseInt(e.target.value))}
                  className="bg-neutral-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded py-1 px-2 w-20 transition-all ease-in-out duration-300"
                  placeholder={t('Min')}
                />
                <label className="text-gray-500 text-xs mt-1">{t('Min Likes')}</label>
              </div>
              <div className="flex flex-col">
                <input
                  type="number"
                  min={likesThreshold.min + 1 || 1}
                  value={likesThreshold.max === Infinity ? '' : likesThreshold.max}
                  onChange={(e) =>
                    handleLikesThresholdChange(
                      'max',
                      e.target.value === '' ? Infinity : parseInt(e.target.value)
                    )
                  }
                  className="bg-neutral-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded py-1 px-2 w-20 transition-all ease-in-out duration-300"
                  placeholder={t('Max')}
                />
                <label className="text-gray-500 text-xs mt-1">{t('Max Likes')}</label>
              </div>
            </div>
          </div>
          {/* Replies Filter */}
          <div className="flex flex-col">
            <div className="flex items-center mb-1">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-gray-800 dark:text-gray-200 mr-2" />
              <label className="text-gray-800 dark:text-gray-200 ">{t('Replies')}</label>
            </div>
            <div className="flex space-x-2">
              <div className="flex flex-col">
                <input
                  type="number"
                  min="0"
                  max={typeof repliesLimit.max === 'number' ? repliesLimit.max - 1 : undefined}
                  value={repliesLimit.min}
                  onChange={(e) => handleRepliesLimitChange('min', parseInt(e.target.value))}
                  className="bg-neutral-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded py-1 px-2 w-20 transition-all ease-in-out duration-300"
                  placeholder={t('Min')}
                />
                <label className="text-gray-500 text-xs mt-1">{t('Min Replies')}</label>
              </div>
              <div className="flex flex-col">
                <input
                  type="number"
                  min={repliesLimit.min + 1 || 1}
                  value={repliesLimit.max === Infinity ? '' : repliesLimit.max}
                  onChange={(e) =>
                    handleRepliesLimitChange(
                      'max',
                      e.target.value === '' ? Infinity : parseInt(e.target.value)
                    )
                  }
                  className="bg-neutral-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded py-1 px-2 w-20 transition-all ease-in-out duration-300"
                  placeholder={t('Max')}
                />
                <label className="text-gray-500 text-xs mt-1">{t('Max Replies')}</label>
              </div>
            </div>
          </div>
          {/* Word Count Filter */}
          <div className="flex flex-col">
            <div className="flex items-center mb-1">
              <DocumentTextIcon className="w-5 h-5 text-gray-800 dark:text-gray-200 mr-2" />
              <label className="text-gray-800 dark:text-gray-200 ">{t('Word Count')}</label>
            </div>
            <div className="flex space-x-2">
              <div className="flex flex-col">
                <input
                  type="number"
                  min="0"
                  max={typeof wordCount.max === 'number' ? wordCount.max - 1 : undefined}
                  value={wordCount.min}
                  onChange={(e) => handleWordCountChange('min', parseInt(e.target.value))}
                  className="bg-neutral-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded py-1 px-2 w-20 transition-all ease-in-out duration-300"
                  placeholder={t('Min')}
                />
                <label className="text-gray-500 text-xs mt-1">{t('Min Words')}</label>
              </div>
              <div className="flex flex-col">
                <input
                  type="number"
                  min={wordCount.min + 1 || 1}
                  value={wordCount.max === Infinity ? '' : wordCount.max}
                  onChange={(e) =>
                    handleWordCountChange(
                      'max',
                      e.target.value === '' ? Infinity : parseInt(e.target.value)
                    )
                  }
                  className="bg-neutral-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded py-1 px-2 w-20 transition-all ease-in-out duration-300"
                  placeholder={t('Max')}
                />
                <label className="text-gray-500 text-xs mt-1">{t('Max Words')}</label>
              </div>
            </div>
          </div>
          {/* Date & Time Range Filter */}
          <div className="flex flex-col">
            <div className="flex items-center mb-1">
              <CalendarDaysIcon className="w-5 h-5 text-gray-800 dark:text-gray-200 mr-2" />
              <label className="text-gray-800 dark:text-gray-200 ">{t('Date & Time Range')}</label>
            </div>
            <div className="flex space-x-2">
              <div className="flex flex-col">
                <input
                  type="datetime-local"
                  value={dateTimeRange.start}
                  onChange={(e) => handleDateTimeRangeChange('start', e.target.value)}
                  className="bg-neutral-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded p-1 w-full transition-all ease-in-out duration-300"
                />
                <label className="text-gray-500 text-xs mt-1">{t('Start')}</label>
              </div>
              <div className="flex flex-col">
                <input
                  type="datetime-local"
                  value={dateTimeRange.end}
                  min={dateTimeRange.start} // Ensure end cannot be before start
                  max={new Date().toISOString().slice(0, 16)} // Current date and time
                  onChange={(e) => handleDateTimeRangeChange('end', e.target.value)}
                  className="bg-neutral-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded p-1 w-full transition-all ease-in-out duration-300"
                />
                <label className="text-gray-500 text-xs mt-1">{t('End')}</label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedFilters;
