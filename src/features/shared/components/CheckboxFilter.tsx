import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckboxFilterProps } from "../../../types/filterTypes";

const CheckboxFilter: React.FC<CheckboxFilterProps> = ({ name, icon, value, checked, onChange, disabled }) => {
    const { t } = useTranslation();

    return (
        <label className={`flex items-center select-none text-gray-800 dark:text-gray-200 mb-1 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="relative">
                <input
                    type="checkbox"
                    name={value}
                    checked={checked}
                    onChange={onChange}
                    disabled={disabled}
                    className="absolute opacity-0 h-0 w-0"
                    aria-checked={checked}
                    aria-disabled={disabled}
                    aria-label={name}
                />
                <div className={`h-5 w-5 border-2 rounded-md flex items-center justify-center transition duration-300 ease-in-out ${checked ? 'bg-teal-600 dark:bg-teal-400 border-teal-600 dark:border-teal-400' : 'border-gray-400 dark:border-gray-600'}`}>
                    {checked && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
                        </svg>
                    )}
                </div>
            </div>
            <div className="ml-3 flex items-center">
                {icon}
                <span className="truncate">{name}</span>
            </div>
        </label>
    );
};

export default CheckboxFilter;
