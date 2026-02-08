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
      className={`checkbox-filter inline-flex min-w-0 items-center justify-center cq-[56rem]:justify-start select-none rounded-md border px-1.5 py-1 text-gray-700 dark:text-gray-200 text-xs cq-[42rem]:text-sm mb-1 transition-colors duration-200 ${
        checked
          ? 'border-teal-300 bg-teal-50/80 dark:border-teal-500/60 dark:bg-teal-900/30'
          : 'border-gray-200 bg-white/70 dark:border-gray-700 dark:bg-gray-800/60'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
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
      <div className="relative hidden cq-[56rem]:block">
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
      <div className="ml-0 cq-[56rem]:ml-2 flex min-w-0 items-center justify-center">
        <span className={`${checked ? 'text-teal-700 dark:text-teal-300' : ''}`}>{icon}</span>
        <span className="hidden cq-[56rem]:inline truncate leading-tight">{name}</span>
      </div>
    </label>
  );
};

export default CheckboxFilter;
