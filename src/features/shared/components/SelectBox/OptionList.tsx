// src/components/common/SelectBox/OptionList.tsx
import React from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { Option } from '../../../../types/utilityTypes';
import Tooltip from '../Tooltip';

interface OptionListProps {
  options: Option[];
  highlightedIndex: number;
  handleOptionClick: (option: Option, index: number) => void;
  searchTerm: string;
}

const handleOptionKeyDown = (
  event: React.KeyboardEvent,
  option: Option,
  index: number,
  handleOptionClick: (option: Option, index: number) => void
) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;

  event.preventDefault();
  handleOptionClick(option, index);
};

const OptionList: React.FC<OptionListProps> = ({
  options,
  highlightedIndex,
  handleOptionClick,
  searchTerm,
}) => {
  const { t } = useTranslation();

  const renderLabel = (option: Option) => {
    if (!searchTerm) return option.label;

    return (
      <span
        dangerouslySetInnerHTML={{
          __html: option.label.replace(
            new RegExp(searchTerm, 'gi'),
            (match) => `<strong>${match}</strong>`
          ),
        }}
      ></span>
    );
  };

  return (
    <div
      className="py-1 max-h-60 overflow-y-auto custom-scrollbar"
      role="listbox"
      tabIndex={-1}
      aria-activedescendant={`option-${highlightedIndex}`}
    >
      {options.length > 0 ? (
        options.map((option, index) => (
          <div
            key={option.value}
            onClick={() => handleOptionClick(option, index)}
            onKeyDown={(event) => handleOptionKeyDown(event, option, index, handleOptionClick)}
            className={`flex items-center px-4 py-2 text-sm w-full ${
              option.disabled
                ? 'cursor-not-allowed text-gray-400 dark:text-gray-500'
                : 'text-gray-800 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-600'
            } ${
              highlightedIndex === index && !option.disabled ? 'bg-gray-100 dark:bg-gray-600' : ''
            } transition-all duration-300 ease-in-out`}
            role="option"
            aria-selected={highlightedIndex === index}
            aria-disabled={option.disabled}
            id={`option-${index}`}
            data-testid={`option-${option.value}`}
            tabIndex={-1}
          >
            {option.icon && <option.icon className="w-5 h-5 mr-2" />}
            <span className="min-w-0 flex-1 text-left">{renderLabel(option)}</span>
            {option.disabled && option.disabledReason && (
              <Tooltip text={option.disabledReason} position="left">
                <span
                  className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded text-gray-500 dark:text-gray-400"
                  aria-label={option.disabledReason}
                >
                  <InformationCircleIcon className="h-4 w-4" />
                </span>
              </Tooltip>
            )}
          </div>
        ))
      ) : (
        <div className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">{t('noOptions')}</div>
      )}
    </div>
  );
};

export default OptionList;
