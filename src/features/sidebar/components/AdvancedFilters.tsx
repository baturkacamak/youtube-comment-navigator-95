import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { HandThumbUpIcon, ChatBubbleLeftRightIcon, CalendarDaysIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { useTranslation } from 'react-i18next';
import { setFilters } from '../../../store/store';
import { RootState } from '../../../types/rootState';
import { FilterState } from '../../../types/filterTypes';

const AdvancedFilters: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const filters = useSelector((state: RootState) => state.filters);
    const [likesThreshold, setLikesThreshold] = useState<{ min: number; max: number | string }>({ min: 0, max: Infinity });
    const [repliesLimit, setRepliesLimit] = useState<{ min: number; max: number | string }>({ min: 0, max: Infinity });
    const [wordCount, setWordCount] = useState<{ min: number; max: number | string }>({ min: 0, max: Infinity });
    const [dateTimeRange, setDateTimeRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

    useEffect(() => {
        setDateTimeRange({ start: '', end: '' }); // Initialize end with current date and time
    }, []);

    const updateFilter = (key: keyof FilterState, value: any) => {
        dispatch(setFilters({
            ...filters,
            [key]: value,
        }));
    };

    const handleLikesThresholdChange = (key: 'min' | 'max', value: number) => {
        setLikesThreshold(prev => ({ ...prev, [key]: value }));
        updateFilter('likesThreshold', { ...likesThreshold, [key]: value });
    };

    const handleRepliesLimitChange = (key: 'min' | 'max', value: number) => {
        setRepliesLimit(prev => ({ ...prev, [key]: value }));
        updateFilter('repliesLimit', { ...repliesLimit, [key]: value });
    };

    const handleWordCountChange = (key: 'min' | 'max', value: number) => {
        setWordCount(prev => ({ ...prev, [key]: value }));
        updateFilter('wordCount', { ...wordCount, [key]: value });
    };

    const handleDateTimeRangeChange = (key: 'start' | 'end', value: string) => {
        setDateTimeRange(prev => ({ ...prev, [key]: value }));
        updateFilter('dateTimeRange', { ...dateTimeRange, [key]: value });
    };

    return (
        <div className="rounded-lg shadow-lg ml-10">
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
                                onChange={(e) => handleLikesThresholdChange('max', e.target.value === '' ? Infinity : parseInt(e.target.value))}
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
                                onChange={(e) => handleRepliesLimitChange('max', e.target.value === '' ? Infinity : parseInt(e.target.value))}
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
                                onChange={(e) => handleWordCountChange('max', e.target.value === '' ? Infinity : parseInt(e.target.value))}
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
    );
};

export default AdvancedFilters;
