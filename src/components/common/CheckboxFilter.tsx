import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckboxFilterProps } from "../../types/filterTypes";

const CheckboxFilter: React.FC<CheckboxFilterProps> = ({ name, icon, value, checked, onChange, disabled }) => {
    const { t } = useTranslation();

    return (
        <label className={`flex items-center select-none text-gray-800 dark:text-gray-200 mb-1 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input
                type="checkbox"
                name={value}
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                className="mr-2 form-checkbox h-5 w-5 text-teal-600 dark:text-teal-400 transition duration-150 ease-in-out"
                aria-checked={checked}
                aria-disabled={disabled}
                aria-label={name}
            />
            {icon}
            <span className="truncate">{name}</span>
        </label>
    );
};

export default CheckboxFilter;
