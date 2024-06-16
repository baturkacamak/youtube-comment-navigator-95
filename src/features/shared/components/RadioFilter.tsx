import React, { useState } from 'react';
import { ArrowPathIcon, ArrowUpIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { RadioFilterProps } from "../../../types/filterTypes";

const RadioFilter: React.FC<RadioFilterProps> = ({ name, label, icon, value, selectedValue, sortOrder, isRandom, onChange, onToggleSortOrder }) => {
    const [spin, setSpin] = useState(false);
    const { t } = useTranslation();

    const handleRandomClick = () => {
        if (isRandom) {
            setSpin(true);
            setTimeout(() => setSpin(false), 1000); // Duration of the animation
            onToggleSortOrder();
        }
    };

    return (
        <label className="flex items-center select-none text-gray-800 dark:text-gray-200 mb-1" aria-label={`Radio filter for ${name}`} role="radio" aria-checked={selectedValue === value}>
            <div className="relative">
                <input
                    type="radio"
                    name="sortBy"
                    value={value}
                    checked={selectedValue === value}
                    onChange={onChange}
                    className="absolute opacity-0 h-0 w-0"
                    aria-checked={selectedValue === value}
                    aria-label={name}
                />
                <div className={`h-5 w-5 border-2 rounded-full flex items-center justify-center transition-transform duration-300 ease-in-out transform ${selectedValue === value ? 'bg-teal-600 dark:bg-teal-400 border-teal-600 dark:border-teal-400 scale-110' : 'bg-white border-gray-400 dark:border-gray-600 scale-100'}`}>
                    {selectedValue === value && (
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                    )}
                </div>
            </div>
            <div className="ml-3 flex items-center">
                {icon}
                <span className="truncate">{label}</span>
                {selectedValue === value && (
                    <button
                        onClick={isRandom ? handleRandomClick : onToggleSortOrder}
                        className="ml-2 transition-transform duration-500 ease-in-out"
                        aria-label={isRandom ? t('Randomize order') : t('Toggle sort order')}
                        aria-live="polite"
                    >
                        {isRandom ? (
                            <ArrowPathIcon className={`w-4 h-4 transform ${spin ? 'animate-spin' : ''}`} />
                        ) : (
                            <ArrowUpIcon className={`w-4 h-4 transform transition-transform duration-300 ease-in-out ${sortOrder === 'asc' ? '' : 'rotate-180'}`} />
                        )}
                    </button>
                )}
            </div>
        </label>
    );
};

export default RadioFilter;
