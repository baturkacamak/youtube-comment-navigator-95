// src/components/features/sidebar/AdvancedSorting.tsx

import React from 'react';
import {CalendarIcon, ChartBarIcon, HandThumbUpIcon, UserIcon} from '@heroicons/react/24/outline';

import {AdvancedSortingProps} from "../../../types/filterTypes";

const AdvancedSorting: React.FC<AdvancedSortingProps> = ({ filters, setFilters }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    return (
        <div className={`mt-4 bg-gray-100 dark:bg-gray-800 p-2 border border-gray-400 dark:border-gray-600 shadow-inner transition-all duration-500 ease-in-out overflow-hidden`}>
            <div className="mb-2 flex items-center">
                <HandThumbUpIcon className="w-5 h-5 mr-2" />
                <input
                    type="number"
                    name="minLikes"
                    value={filters.minLikes}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-400 dark:border-gray-600 rounded"
                    placeholder="Min Likes"
                />
            </div>
            <div className="mb-2 flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2" />
                <input
                    type="date"
                    name="startDate"
                    value={filters.startDate}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-400 dark:border-gray-600 rounded"
                    placeholder="Start Date"
                />
            </div>
            <div className="mb-2 flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2" />
                <input
                    type="date"
                    name="endDate"
                    value={filters.endDate}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-400 dark:border-gray-600 rounded"
                    placeholder="End Date"
                />
            </div>
            <div className="mb-2 flex items-center">
                <UserIcon className="w-5 h-5 mr-2" />
                <input
                    name="user"
                    value={filters.user}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-400 dark:border-gray-600 rounded"
                    placeholder="User"
                />
            </div>
            <div className="mb-2 flex items-center">
                <ChartBarIcon className="w-5 h-5 mr-2" />
                <input
                    type="number"
                    name="minLength"
                    placeholder="Min Length"
                    value={filters.minLength}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-400 dark:border-gray-600 rounded"
                />
                <input
                    type="number"
                    name="maxLength"
                    placeholder="Max Length"
                    value={filters.maxLength}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-400 dark:border-gray-600 rounded"
                />
            </div>
        </div>
    );
};

export default AdvancedSorting;
