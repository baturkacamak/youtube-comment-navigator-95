// src/components/features/sidebar/SidebarFilterPanel.tsx
import React, {useEffect, useState} from 'react';
import {ArrowsUpDownIcon, FunnelIcon} from '@heroicons/react/24/outline';
import Box from "../../common/Box";
import FilterList from './FilterList';
import SortList from './SortList';
import LoadingSection from '../loading/LoadingSection';
import {ControlPanelProps} from "../../../types/filterTypes";
import SettingsButton from "../../common/SettingsButton";
import Tooltip from "../../common/Tooltip";

const ControlPanel: React.FC<ControlPanelProps> = ({
                                                       filters,
                                                       setFilters,
                                                       onLoadComments, onLoadChat, onLoadTranscript, onLoadAll,
                                                       commentsCount, repliesCount, transcriptsCount,
                                                       openSettings
                                                   }) => {
    const [showAdvanced, setShowAdvanced] = useState(false);

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
        <Box className={`flex flex-col w-full gap-6`}>
            <div className="flex">
                <SettingsButton onClick={openSettings}/>
                <h3 className="m-auto text-lg font-bold text-teal-800 dark:text-teal-200">YouTube Comment Navigator 95</h3>
            </div>
            <hr className="border-gray-400 dark:border-gray-600"/>
            <div className="flex justify-between">
                <div className="flex flex-col gap-4">
                    <div className="flex gap-4 items-center">
                        <Tooltip text="Filter By">
                            <FunnelIcon className="w-6 h-6"/>
                        </Tooltip>
                        <div className="flex gap-4">
                            <FilterList filters={filters} setFilters={setFilters}/>
                        </div>
                    </div>
                    <div className="flex gap-4 items-center">
                        <Tooltip text="Sort By">
                            <ArrowsUpDownIcon className="w-6 h-6"/>
                        </Tooltip>
                        <div className="flex gap-4">
                            <SortList filters={filters} setFilters={setFilters}/>
                        </div>
                    </div>
                </div>
                <LoadingSection
                    onLoadComments={onLoadComments}
                    onLoadChat={onLoadChat}
                    onLoadTranscript={onLoadTranscript}
                    onLoadAll={onLoadAll}
                    commentsCount={commentsCount}
                    repliesCount={repliesCount}
                    transcriptsCount={transcriptsCount}
                />
            </div>
        </Box>
    );
};

export default ControlPanel;
