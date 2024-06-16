import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ArrowsUpDownIcon, FunnelIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import Box from '../../shared/components/Box';
import FilterList from './FilterList';
import SortList from './SortList';
import LoadingSection from '../../loading/components/LoadingSection';
import { ControlPanelProps } from '../../../types/filterTypes';
import SettingsButton from '../../shared/components/SettingsButton';
import Button from '../../shared/components/Button'; // Import your Button component
import { useTranslation } from 'react-i18next';
import { RootState } from '../../../types/rootState';

const ControlPanel: React.FC<ControlPanelProps> = ({
                                                       filters,
                                                       setFilters,
                                                       onLoadComments,
                                                       onLoadChat,
                                                       onLoadTranscript,
                                                       onLoadAll,
                                                       repliesCount,
                                                       transcriptsCount,
                                                       openSettings,
                                                       toggleBookmarkedComments,
                                                       showBookmarkedComments
                                                   }) => {
    const { t } = useTranslation();
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Get the bookmark count from the Redux state
    const bookmarkCount = useSelector((state: RootState) => state.bookmarkedComments.length);

    useEffect(() => {
        if (!filters.initialized) {
            setFilters({
                ...filters,
                sortBy: '',
                sortOrder: 'desc',
                minLikes: '',
                startDate: '',
                endDate: '',
                user: '',
                minLength: '',
                maxLength: '',
                initialized: true,
            });
        }
    }, [filters, setFilters]);

    return (
        <Box className="flex flex-col w-full gap-2" aria-label={t('Control Panel')}>
            <div className="flex items-center justify-between">
                <SettingsButton onClick={openSettings} aria-label={t('Open settings')} />
                <h3 className="text-lg font-bold text-teal-800 dark:text-teal-200" aria-label={t('YouTube Comment Navigator 95')}>
                    {t('YouTube Comment Navigator 95')}
                </h3>
                <Button
                    onClick={toggleBookmarkedComments}
                    icon={BookmarkIcon}
                    label={`(${bookmarkCount})`}
                    className={`text-white ${showBookmarkedComments ? 'bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800' : 'bg-teal-500 hover:bg-teal-600 dark:bg-teal-700 dark:hover:bg-teal-800'}`}
                    iconOnly={bookmarkCount === 0}
                />
            </div>
            <hr className="border border-solid border-gray-400 dark:border-gray-600" />
            <div className="flex justify-between">
                <div className="flex flex-col gap-4">
                    <div className="flex gap-4 items-center">
                        <FunnelIcon className="w-6 h-6" aria-hidden="true" />
                        <div className="flex gap-4">
                            <FilterList filters={filters} setFilters={setFilters} />
                        </div>
                    </div>
                    <div className="flex gap-4 items-center">
                        <ArrowsUpDownIcon className="w-6 h-6" aria-hidden="true" />
                        <div className="flex gap-4">
                            <SortList filters={filters} setFilters={setFilters} />
                        </div>
                    </div>
                </div>
                <LoadingSection
                    onLoadComments={onLoadComments}
                    onLoadChat={onLoadChat}
                    onLoadTranscript={onLoadTranscript}
                    onLoadAll={onLoadAll}
                    repliesCount={repliesCount}
                    transcriptsCount={transcriptsCount}
                />
            </div>
        </Box>
    );
};

export default ControlPanel;
