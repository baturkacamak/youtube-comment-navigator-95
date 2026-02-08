import React from 'react';
import { CheckboxFilterProps } from '../../../types/filterTypes';

const CheckboxFilter: React.FC<CheckboxFilterProps> = ({
  name,
  icon,
  value,
  checked,
  onChange,
  disabled,
}) => {
  return (
    <label
      className={`checkbox-filter flex min-w-0 items-center select-none text-gray-800 dark:text-gray-200 text-xs cq-[42rem]:text-sm mb-1 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
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
        <div
          className={`h-4 w-4 cq-[42rem]:h-5 cq-[42rem]:w-5 border border-solid rounded-md flex items-center justify-center transition-transform duration-300 ease-in-out transform ${checked ? 'bg-slate-400 dark:bg-teal-400 border-slate-900 dark:border-teal-400 scale-110' : 'bg-white border-gray-500 dark:border-gray-600 scale-100'}`}
        >
          {checked && (
            <svg
              className="w-3 h-3 cq-[42rem]:w-4 cq-[42rem]:h-4 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
            </svg>
          )}
        </div>
      </div>
      <div className="ml-2 flex min-w-0 items-center justify-center cq-[38rem]:justify-start">
        {icon}
        <span className="hidden cq-[38rem]:inline truncate leading-tight">{name}</span>
      </div>
    </label>
  );
};

export default CheckboxFilter;
