import React, { useState } from 'react';
import { ArrowPathIcon, ArrowUpIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { RadioFilterProps } from '../../../types/filterTypes';
import i18n from 'i18next';

const RadioFilter: React.FC<RadioFilterProps> = ({
  name,
  label,
  icon,
  value,
  selectedValue,
  sortOrder,
  isRandom,
  onChange,
  onToggleSortOrder,
}) => {
  const [spin, setSpin] = useState(false);
  const { t } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  const handleRandomClick = () => {
    if (isRandom) {
      setSpin(true);
      setTimeout(() => setSpin(false), 1000); // Duration of the animation
      onToggleSortOrder();
    }
  };

  const handleRadioClick = () => {
    if (selectedValue === value) {
      onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  return (
    <label
      className={`radio-filter inline-flex min-w-0 items-center justify-center cq-[56rem]:justify-start select-none rounded-md border px-1.5 py-1 text-xs cq-[42rem]:text-sm text-gray-700 dark:text-gray-200 mb-1 cq-[42rem]:mb-2 cursor-pointer transition-colors duration-200 ${
        selectedValue === value
          ? 'border-teal-300 bg-teal-50/80 dark:border-teal-500/60 dark:bg-teal-900/30'
          : 'border-gray-200 bg-white/70 dark:border-gray-700 dark:bg-gray-800/60'
      }`}
    >
      <input
        type="radio"
        name="sortBy"
        value={value}
        checked={selectedValue === value}
        onChange={onChange}
        onClick={handleRadioClick}
        className="absolute opacity-0 h-0 w-0"
        aria-checked={selectedValue === value}
        aria-label={name}
      />
      <div className="relative hidden cq-[56rem]:block">
        <div
          className={`h-4 w-4 cq-[42rem]:h-5 cq-[42rem]:w-5 border rounded-full border-solid flex items-center justify-center transition-all duration-300 ease-in-out ${selectedValue === value ? 'bg-slate-400 dark:bg-teal-400 border-slate-900 dark:border-teal-100 scale-110' : 'bg-white dark:bg-white-700 border-gray-500 dark:border-gray-600'}`}
        ></div>
      </div>
      <div
        className={`flex min-w-0 items-center space-x-1.5 cq-[42rem]:space-x-2 ${isRtl ? 'mr-0 cq-[56rem]:mr-2 cq-[42rem]:mr-3' : 'ml-0 cq-[56rem]:ml-2 cq-[42rem]:ml-3'}`}
      >
        <span className={`${selectedValue === value ? 'text-teal-700 dark:text-teal-300' : ''}`}>
          {icon}
        </span>
        <span className="hidden cq-[56rem]:inline truncate leading-tight">{label}</span>
        {selectedValue === value && (
          <button
            onClick={isRandom ? handleRandomClick : onToggleSortOrder}
            className={`inline-flex shrink-0 transition-transform duration-500 ease-in-out ${isRtl ? 'mr-1 cq-[42rem]:mr-2' : 'ml-1 cq-[42rem]:ml-2'}`}
            aria-label={isRandom ? t('Randomize order') : t('Toggle sort order')}
            aria-live="polite"
          >
            {isRandom ? (
              <ArrowPathIcon
                className={`w-3.5 h-3.5 cq-[42rem]:w-4 cq-[42rem]:h-4 transform ${spin ? 'animate-spin' : ''}`}
              />
            ) : (
              <ArrowUpIcon
                className={`w-3.5 h-3.5 cq-[42rem]:w-4 cq-[42rem]:h-4 transform transition-transform duration-300 ease-in-out ${sortOrder === 'asc' ? '' : 'rotate-180'}`}
              />
            )}
          </button>
        )}
      </div>
    </label>
  );
};

export default RadioFilter;
