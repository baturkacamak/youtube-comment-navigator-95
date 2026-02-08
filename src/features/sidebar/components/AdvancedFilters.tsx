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
import Input from '../../shared/components/Input';

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
  const debounceTimers = useRef<{ [key: string]: NodeJS.Timeout }>({
    /* no-op */
  });

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
    <div className="advanced-filters cq rounded-lg shadow-lg p-3 cq-[48rem]:p-4 bg-white dark:bg-gray-800">
      <div className="advanced-filters__grid mt-1 grid grid-cols-1 gap-3 cq-[48rem]:grid-cols-2">
        <div className="advanced-filters__group rounded-md border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center mb-2">
            <HandThumbUpIcon className="w-4 h-4 cq-[42rem]:w-5 cq-[42rem]:h-5 text-gray-800 dark:text-gray-200 mr-2" />
            <label className="text-sm text-gray-800 dark:text-gray-200">{t('Likes')}</label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <Input
                type="number"
                min={0}
                max={typeof likesThreshold.max === 'number' ? likesThreshold.max - 1 : undefined}
                value={likesThreshold.min}
                onChange={(e) => handleLikesThresholdChange('min', parseInt(e.target.value))}
                className="py-1.5 px-2 w-full text-sm"
                placeholder={t('Min')}
              />
              <label className="text-gray-500 text-[11px] mt-1">{t('Min Likes')}</label>
            </div>
            <div className="flex flex-col">
              <Input
                type="number"
                min={likesThreshold.min + 1 || 1}
                value={likesThreshold.max === Infinity ? '' : likesThreshold.max}
                onChange={(e) =>
                  handleLikesThresholdChange(
                    'max',
                    e.target.value === '' ? Infinity : parseInt(e.target.value)
                  )
                }
                className="py-1.5 px-2 w-full text-sm"
                placeholder={t('Max')}
              />
              <label className="text-gray-500 text-[11px] mt-1">{t('Max Likes')}</label>
            </div>
          </div>
        </div>

        <div className="advanced-filters__group rounded-md border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center mb-2">
            <ChatBubbleLeftRightIcon className="w-4 h-4 cq-[42rem]:w-5 cq-[42rem]:h-5 text-gray-800 dark:text-gray-200 mr-2" />
            <label className="text-sm text-gray-800 dark:text-gray-200">{t('Replies')}</label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <Input
                type="number"
                min={0}
                max={typeof repliesLimit.max === 'number' ? repliesLimit.max - 1 : undefined}
                value={repliesLimit.min}
                onChange={(e) => handleRepliesLimitChange('min', parseInt(e.target.value))}
                className="py-1.5 px-2 w-full text-sm"
                placeholder={t('Min')}
              />
              <label className="text-gray-500 text-[11px] mt-1">{t('Min Replies')}</label>
            </div>
            <div className="flex flex-col">
              <Input
                type="number"
                min={repliesLimit.min + 1 || 1}
                value={repliesLimit.max === Infinity ? '' : repliesLimit.max}
                onChange={(e) =>
                  handleRepliesLimitChange(
                    'max',
                    e.target.value === '' ? Infinity : parseInt(e.target.value)
                  )
                }
                className="py-1.5 px-2 w-full text-sm"
                placeholder={t('Max')}
              />
              <label className="text-gray-500 text-[11px] mt-1">{t('Max Replies')}</label>
            </div>
          </div>
        </div>

        <div className="advanced-filters__group rounded-md border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center mb-2">
            <DocumentTextIcon className="w-4 h-4 cq-[42rem]:w-5 cq-[42rem]:h-5 text-gray-800 dark:text-gray-200 mr-2" />
            <label className="text-sm text-gray-800 dark:text-gray-200">{t('Word Count')}</label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <Input
                type="number"
                min={0}
                max={typeof wordCount.max === 'number' ? wordCount.max - 1 : undefined}
                value={wordCount.min}
                onChange={(e) => handleWordCountChange('min', parseInt(e.target.value))}
                className="py-1.5 px-2 w-full text-sm"
                placeholder={t('Min')}
              />
              <label className="text-gray-500 text-[11px] mt-1">{t('Min Words')}</label>
            </div>
            <div className="flex flex-col">
              <Input
                type="number"
                min={wordCount.min + 1 || 1}
                value={wordCount.max === Infinity ? '' : wordCount.max}
                onChange={(e) =>
                  handleWordCountChange(
                    'max',
                    e.target.value === '' ? Infinity : parseInt(e.target.value)
                  )
                }
                className="py-1.5 px-2 w-full text-sm"
                placeholder={t('Max')}
              />
              <label className="text-gray-500 text-[11px] mt-1">{t('Max Words')}</label>
            </div>
          </div>
        </div>

        <div className="advanced-filters__group rounded-md border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center mb-2">
            <CalendarDaysIcon className="w-4 h-4 cq-[42rem]:w-5 cq-[42rem]:h-5 text-gray-800 dark:text-gray-200 mr-2" />
            <label className="text-sm text-gray-800 dark:text-gray-200">
              {t('Date & Time Range')}
            </label>
          </div>
          <div className="grid grid-cols-1 gap-2 cq-[36rem]:grid-cols-2">
            <div className="flex flex-col">
              <Input
                type="datetime-local"
                value={dateTimeRange.start}
                onChange={(e) => handleDateTimeRangeChange('start', e.target.value)}
                className="py-1.5 px-2 w-full text-sm"
              />
              <label className="text-gray-500 text-[11px] mt-1">{t('Start')}</label>
            </div>
            <div className="flex flex-col">
              <Input
                type="datetime-local"
                value={dateTimeRange.end}
                min={dateTimeRange.start}
                max={new Date().toISOString().slice(0, 16)}
                onChange={(e) => handleDateTimeRangeChange('end', e.target.value)}
                className="py-1.5 px-2 w-full text-sm"
              />
              <label className="text-gray-500 text-[11px] mt-1">{t('End')}</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedFilters;
