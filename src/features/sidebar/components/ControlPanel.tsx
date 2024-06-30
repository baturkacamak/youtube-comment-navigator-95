import React, {useEffect, useRef, useState} from 'react';
import {useSelector} from 'react-redux';
import FilterList from './FilterList';
import SortList from './SortList';
import AdvancedFilters from './AdvancedFilters';
import {ControlPanelProps} from '../../../types/filterTypes';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../../types/rootState';
import {ArrowsUpDownIcon, ChevronDownIcon, FunnelIcon} from "@heroicons/react/24/outline";

const ControlPanel: React.FC<ControlPanelProps> = ({filters, setFilters}) => {
    const {t} = useTranslation();
    const [showAdvanced, setShowAdvanced] = useState(true);
    const [maxHeight, setMaxHeight] = useState('0px');
    const containerRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        if (containerRef.current) {
            setMaxHeight(showAdvanced ? `${containerRef.current.scrollHeight}px` : '0px');
        }
    }, [showAdvanced]);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex gap-4 items-center">
                <div className="flex gap-4">
                    <ArrowsUpDownIcon className="w-6 h-6 text-black dark:text-white" aria-hidden="true"/>
                    <SortList filters={filters} setFilters={setFilters}/>
                </div>
            </div>
            <div className="flex gap-4 items-center justify-between">
                <div className="flex gap-4">
                    <FunnelIcon className="w-6 h-6 text-black dark:text-white" aria-hidden="true"/>
                    <FilterList filters={filters} setFilters={setFilters}/>
                </div>
                <button onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center text-blue-500 hover:underline">
                    {showAdvanced ? t('Hide Advanced Filters') : t('Show Advanced Filters')}
                    <ChevronDownIcon
                        className={`w-5 h-5 ml-1 transform transition-transform duration-500 ${showAdvanced ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                    />
                </button>
            </div>
            <div
                ref={containerRef}
                style={{maxHeight}}
                className="transition-all duration-500 overflow-hidden"
            >
                <AdvancedFilters/>
            </div>
        </div>
    );
};

export default ControlPanel;
