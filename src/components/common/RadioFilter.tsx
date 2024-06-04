import React, {useState} from 'react';
import {ArrowPathIcon, ArrowUpIcon} from '@heroicons/react/24/outline';

import {RadioFilterProps} from "../../types/filterTypes";

const RadioFilter: React.FC<RadioFilterProps> = ({ name, icon, value, selectedValue, sortOrder, isRandom, onChange, onToggleSortOrder }) => {
    const [spin, setSpin] = useState(false);

    const handleRandomClick = () => {
        if (isRandom) {
            setSpin(true);
            setTimeout(() => setSpin(false), 1000); // Duration of the animation
            onToggleSortOrder();
        }
    };

    return (
        <label className="flex items-center select-none text-gray-800 dark:text-gray-200 mb-1">
            <input
                type="radio"
                name="sortBy"
                value={value}
                checked={selectedValue === value}
                onChange={onChange}
                className="mr-2 form-radio h-5 w-5 text-teal-600 dark:text-teal-400 transition duration-150 ease-in-out"
            />
            {icon}
            <span className="truncate">{name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1')}</span>
            {selectedValue === value && (
                <button onClick={isRandom ? handleRandomClick : onToggleSortOrder} className="ml-2 transition-transform duration-500 ease-in-out">
                    {isRandom ? (
                        <ArrowPathIcon className={`w-4 h-4 transform ${spin ? 'animate-spin' : ''}`} />
                    ) : (
                        <ArrowUpIcon className={`w-4 h-4 transform transition-transform duration-300 ease-in-out ${sortOrder === 'asc' ? '' : 'rotate-180'}`} />
                    )}
                </button>
            )}
        </label>
    );
};

export default RadioFilter;
