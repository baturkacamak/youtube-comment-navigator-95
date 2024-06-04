// src/components/features/sidebar/SidebarFilterPanel.tsx

import React, {useEffect, useState} from 'react';
import {ArrowsUpDownIcon, FunnelIcon} from '@heroicons/react/24/outline';
import Box from "../../common/Box";
import ThemeToggle from './ThemeToggle';
import FilterList from './FilterList';
import SortList from './SortList';

import {SidebarFilterPanelProps} from "../../../types/filterTypes";

const SidebarFilterPanel: React.FC<SidebarFilterPanelProps> = ({filters, setFilters}) => {
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
        <Box className="min-h-64">
            <div className="sticky w-48 top-16">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-center text-teal-800 dark:text-teal-200">YouTube Comment
                        Navigator 95</h3>
                </div>
                <hr className="my-4 border-gray-400 dark:border-gray-600"/>
                <h3 className="mb-4 text-lg font-bold flex items-center text-teal-800 dark:text-teal-200">
                    <FunnelIcon className="w-6 h-6 mr-2"/>
                    Filter By
                </h3>
                <FilterList filters={filters} setFilters={setFilters}/>
                <hr className="my-4 border-gray-400 dark:border-gray-600"/>
                <h3 className="mb-4 text-lg font-bold flex items-center text-teal-800 dark:text-teal-200">
                    <ArrowsUpDownIcon className="w-6 h-6 mr-2"/>
                    Sort By
                </h3>
                <SortList filters={filters} setFilters={setFilters}/>
                <div className="flex justify-center pt-4">
                    <ThemeToggle/>
                </div>
                {/*<div className="mt-4">*/}
                {/*    <button*/}
                {/*        onClick={() => setShowAdvanced(!showAdvanced)}*/}
                {/*        className="relative bg-teal-700 dark:bg-gray-800 text-white px-4 py-2 rounded w-full flex items-center justify-center border border-gray-400 dark:border-gray-600 shadow transition duration-500 ease-in-out whitespace-nowrap"*/}
                {/*    >*/}
                {/*        <Cog6ToothIcon className={`w-5 h-5 mr-2 transform transition-transform duration-500 ${showAdvanced ? 'rotate-180' : 'rotate-0'}`} />*/}
                {/*        <span className={`transition-opacity duration-500 ${showAdvanced ? 'opacity-0' : 'opacity-100'}`}>Show Advanced Sorting</span>*/}
                {/*        <span className={`absolute transition-opacity duration-500 ${showAdvanced ? 'opacity-100' : 'opacity-0'}`}>Hide Advanced Sorting</span>*/}
                {/*    </button>*/}
                {/*</div>*/}
                {/*{showAdvanced && (*/}
                {/*    <AdvancedSorting filters={filters} setFilters={setFilters} />*/}
                {/*)}*/}
            </div>
        </Box>
    );
};

export default SidebarFilterPanel;
