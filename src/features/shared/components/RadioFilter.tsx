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
    <label className="flex items-center select-none text-gray-800 dark:text-gray-200 mb-2 cursor-pointer">
      <div className="relative">
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
        <div
          className={`h-5 w-5 border rounded-full border-solid flex items-center justify-center transition-all duration-300 ease-in-out ${selectedValue === value ? 'bg-slate-400 dark:bg-teal-400 border-slate-900 dark:border-teal-100 scale-110' : 'bg-white dark:bg-white-700 border-gray-500 dark:border-gray-600'}`}
        ></div>
      </div>
      <div className={`flex items-center space-x-2 ${isRtl ? 'mr-3' : 'ml-3'}`}>
        {icon}
        <span className="truncate">{label}</span>
        {selectedValue === value && (
          <button
            onClick={isRandom ? handleRandomClick : onToggleSortOrder}
            className={`transition-transform duration-500 ease-in-out ${isRtl ? 'mr-2' : 'ml-2'}`}
            aria-label={isRandom ? t('Randomize order') : t('Toggle sort order')}
            aria-live="polite"
          >
            {isRandom ? (
              <ArrowPathIcon className={`w-4 h-4 transform ${spin ? 'animate-spin' : ''}`} />
            ) : (
              <ArrowUpIcon
                className={`w-4 h-4 transform transition-transform duration-300 ease-in-out ${sortOrder === 'asc' ? '' : 'rotate-180'}`}
              />
            )}
          </button>
        )}
      </div>
    </label>
  );
};

export default RadioFilter;
