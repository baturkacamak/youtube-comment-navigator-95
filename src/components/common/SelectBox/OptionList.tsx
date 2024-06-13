// src/components/common/SelectBox/OptionList.tsx
import React from 'react';
import { Option } from '../../../types/utilityTypes';
import { useTranslation } from 'react-i18next';

interface OptionListProps {
    options: Option[];
    highlightedIndex: number;
    handleOptionClick: (option: Option, index: number) => void;
    searchTerm: string;
}

const OptionList: React.FC<OptionListProps> = ({ options, highlightedIndex, handleOptionClick, searchTerm }) => {
    const { t } = useTranslation();

    return (
        <div className="py-1 max-h-60 overflow-y-auto custom-scrollbar" role="listbox" aria-activedescendant={`option-${highlightedIndex}`}>
            {options.length > 0 ? (
                options.map((option, index) => (
                    <button
                        key={option.value}
                        onClick={() => handleOptionClick(option, index)}
                        className={`flex items-center px-4 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-900 w-full ${
                            highlightedIndex === index ? 'bg-gray-100 dark:bg-gray-600' : ''
                        } transition-all duration-300 ease-in-out`}
                        role="option"
                        aria-selected={highlightedIndex === index}
                        id={`option-${index}`}
                    >
                        {option.icon && <option.icon className="w-5 h-5 mr-2" />}
                        <span dangerouslySetInnerHTML={{ __html: option.label.replace(new RegExp(searchTerm, 'gi'), match => `<strong>${match}</strong>`) }}></span>
                    </button>
                ))
            ) : (
                <div className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">
                    {t('No options available')}
                </div>
            )}
        </div>
    );
};

export default OptionList;
