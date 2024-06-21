import React, {useEffect, useState} from 'react';
import {useSelector} from 'react-redux';
import FilterList from './FilterList';
import SortList from './SortList';
import {ControlPanelProps} from '../../../types/filterTypes';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../../types/rootState';
import {ArrowsUpDownIcon, FunnelIcon} from "@heroicons/react/24/outline";

const ControlPanel: React.FC<ControlPanelProps> = ({
                                                       filters,
                                                       setFilters,
                                                   }) => {
    const {t} = useTranslation();
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
        <div className="flex flex-col gap-2">
            <div className="flex gap-4 items-center">
                <div className="flex gap-4">
                    <ArrowsUpDownIcon className="w-6 h-6 text-black dark:text-white" aria-hidden="true" />
                    <SortList filters={filters} setFilters={setFilters}/>
                </div>
            </div>
            <div className="flex gap-4 items-center">
                <FunnelIcon className="w-6 h-6 text-black dark:text-white" aria-hidden="true" />
                <div className="flex gap-4">
                    <FilterList filters={filters} setFilters={setFilters}/>
                </div>
            </div>
        </div>
    );
};

export default ControlPanel;
